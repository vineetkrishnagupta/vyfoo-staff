exports.getAllProducts = async (req, res) => {
  try {
    const fooder_id = req.staff.fooder_id;

    // 1. Run all independent queries in parallel
    const [
      [otherRows],
      [results],
      [getposAllProductDetailsResult],
      [getposAllMenusDetailsResult],
      [tableNameResult],
      [serviceChargeDetailsResult],
      [totalAttribute],
      [fDetailsResult],
      [getStaffDetailsResult]
    ] = await Promise.all([
      pool.query(`SELECT id FROM fooders_tables WHERE fooder_id = ? and category_id = 0`, [fooder_id]),
      pool.query(`
        SELECT 
          fooder_table_category.id, 
          fooder_table_category.table_categoryName, 
          fooder_table_category.status, 
          fooders_tables.table_name,
          fooders_tables.type, 
          fooders_tables.table_no,
          fooders_tables.is_booked,
          fooders_tables.id as table_id,
          fooders_tables.booked_by as created_by
        FROM fooders_tables
        LEFT JOIN fooder_table_category ON fooders_tables.category_id = fooder_table_category.id
        WHERE fooders_tables.type = 0 AND fooders_tables.fooder_id = ?;
      `, [fooder_id]),
      pool.query(`
        SELECT DISTINCT
          fp.id,
          fp.menu_id,
          fp.name,
          fp.price,
          fp.proprice,
          fp.product_type,
          fp.dine_in_service,
          fp.delivery_service,
          fp.pick_up_service,
          fp.min_order_quantity,
          IF(fd.tax_type = 0, 0, fp.tax_type) AS tax_type,   
          If(fd.gstin IS NULL OR fd.gstin = '' OR fd.gst_type = 1, 0, IF(fd.tax_type = 0, fdt.tax1_value, fp.tax_percent)) AS tax_percent,
          If(fp.packaging_charges IS NULL OR fp.packaging_charges = '', 0, fp.packaging_charges) AS packaging_charges,
          pv.id AS variantId,
          pv.combination,
          pv.combination_details,
          pv.price AS combination_price,
          a.id AS attributeId,
          a.display_name AS attributeName,
          av.id AS attributeValueId,
          av.attribute_value AS attributeValue,
          av.price AS attributePrice,
          faa.fooders_addons_id AS addonId,
          faa.fooders_variants_id AS addonVariantId,
          fa.addon_group_name,
          fa.minimum_item,
          fa.maximum_item,
          fai.id AS addonItemId,
          fai.addon_item_name,
          fai.addon_item_price,
          fai.addon_item_type
        FROM fooders_products fp
        JOIN fooders_menus fm ON fp.menu_id = fm.id
        LEFT JOIN product_variants pv ON fp.id = pv.product_id
        LEFT JOIN attributes a ON fp.id = a.product_id
        LEFT JOIN attribute_values av ON a.id = av.attribute_id
        LEFT JOIN fooders_assign_addons faa ON fp.id = faa.product_id
        LEFT JOIN fooders_addons fa ON faa.fooders_addons_id = fa.id
        LEFT JOIN fooders_addons_items fai ON faa.fooders_addons_id = fai.fooders_addon_id
        LEFT JOIN fooders fd ON fp.fooder_id = fd.fooder_id
        LEFT JOIN fooders_details fdt ON fd.fooder_id = fdt.fooder_id
        WHERE fp.fooder_id = ? AND fp.status = 1 AND fm.status = 1;
      `, [fooder_id]),
      pool.query(`
        SELECT
          fm.id AS menu_id,
          fm.fooder_id,
          fm.name AS menu_name,
          fm.status AS menu_status,
          COUNT(DISTINCT CASE WHEN fp.status = 1 THEN fp.name END) AS product_count
        FROM fooders_menus fm
        LEFT JOIN fooders_products fp ON fm.id = fp.menu_id where fm.fooder_id = ? AND fm.status = 1
        GROUP BY fm.id, fm.fooder_id, fm.name, fm.description, fm.status
      `, [fooder_id]),
      pool.query(`SELECT id, table_name,table_no,status,type FROM fooders_tables where fooder_id = ? and type = 0`, [fooder_id]),
      pool.query(`SELECT id, tax2_name, tax2_value FROM fooders_details WHERE fooder_id = ?`, [fooder_id]),
      pool.query(
        `select a.id as attribute_id, a.display_name as attribute_name, av.id as attribute_value_id, av.attribute_value as attribute_value_name from attributes a left join attribute_values av on a.id = av.attribute_id where a.fooder_id = ? `,
        [fooder_id]
      ),
      pool.query(`
        SELECT 
          f.address, 
          f.landline, 
          f.city,
          f.zipcode,
          f.billing_notes,
          name2,
          CASE
              WHEN s.name IS NULL THEN ''
              ELSE COALESCE(s.name, 'Unknown')
          END AS state
        FROM fooders f
        LEFT JOIN states s ON f.state = s.id
        WHERE f.fooder_id = ?`, [fooder_id]),
      pool.query(`select id,name,type,phone_number,email from fooder_staff where fooder_id = ? and status = 1`, [fooder_id])
    ]);

    // 2. Preprocess table category data
    const otherTableIds = new Set(otherRows.map((row) => row.id.toString()));
    const tableIds = results.map(row => row.table_id);

    // 3. Batch fetch kot_committed and qr_committed for all tables
    let kotCommittedMap = {};
    let qrCommittedMap = {};
    if (tableIds.length > 0) {
      // KOT committed
      const [kotRows] = await pool.query(
        `SELECT fk.table_id, COUNT(*) as cnt
         FROM fooders_kot fk
         WHERE fk.fooder_id = ?
           AND fk.table_id IN (?)
           AND fk.status NOT IN (4, 5)
           AND fk.is_deleted = 0
           AND fk.id NOT IN (
             SELECT oi.product_kot_id FROM order_items oi
           )
         GROUP BY fk.table_id`, [fooder_id, tableIds]
      );
      kotRows.forEach(row => {
        kotCommittedMap[row.table_id] = row.cnt > 0 ? 1 : 0;
      });

      // QR committed
      const [qrRows] = await pool.query(
        `SELECT table_id, COUNT(*) as committed
         FROM orders
         WHERE table_id IN (?)
           AND order_mode IN (0)
           AND payment_status = 0
           AND status != 4
           AND is_cancelled = 0
           AND order_type = 'dine_in'
           AND id > 7100
           AND fooder_id = ?
         GROUP BY table_id`, [tableIds, fooder_id]
      );
      qrRows.forEach(row => {
        qrCommittedMap[row.table_id] = row.committed > 0 ? 1 : 0;
      });
    }

    // 4. Build categoryMap
    const categoryMap = new Map();
    for (const row of results) {
      let categoryId = row.id;
      let categoryName = row.table_categoryName;
      let status = row.status;
      if (
        otherTableIds.has(row.table_id.toString()) ||
        !categoryId ||
        categoryId === '' ||
        categoryId === 0
      ) {
        categoryId = 'Others';
        categoryName = 'Others';
        status = 1;
      }
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId === 'Others' ? '' : categoryId,
          table_categoryName: categoryName,
          status: status,
          table_categoryName_data: [],
        });
      }
      let kot_committed = kotCommittedMap[row.table_id] || 0;
      let qr_committed = qrCommittedMap[row.table_id] || 0;

      // --- MODIFICATION START ---
      // If pos_committed === 1, kot_committed !== 1, qr_committed !== 1, get last order and send is_split
      let is_split = null;
      if (
        row.is_booked === 1 &&
        kot_committed !== 1 &&
        qr_committed !== 1
      ) {
        // Get last order for this table
        const [orderRows] = await pool.query(
          `SELECT is_split FROM orders WHERE table_id = ? AND fooder_id = ? ORDER BY id DESC LIMIT 1`,
          [row.table_id, fooder_id]
        );
        if (orderRows.length > 0) {
          is_split = orderRows[0].is_split;
        }
      }
      // --- MODIFICATION END ---

      categoryMap.get(categoryId).table_categoryName_data.push({
        table_name: row.table_name,
        table_no: row.table_no,
        type: row.type,
        category_id: categoryId === 'Others' ? '' : row.id,
        category_name: categoryName,
        id: row.table_id,
        qr_committed: qr_committed,
        pos_committed: row.is_booked,
        kot_committed: kot_committed,
        created_by: JSON.parse(row.created_by),
        ...(is_split !== null ? { is_split } : 0),
      });
    }
    let dataArray = Array.from(categoryMap.values());
    if (dataArray.length === 1 && dataArray[0].id === '') {
      dataArray[0].table_categoryName = '';
    }
    dataArray.sort((a, b) => {
      if (a.table_categoryName === 'Others') return 1;
      if (b.table_categoryName === 'Others') return -1;
      return 0;
    });

    // 5. Product Data Processing (unchanged, but runs after all queries)
    const modifiedData = getposAllProductDetailsResult.map((item) => {
      const combinationDetails = JSON.parse(item.combination_details);
      return { ...item, combination_details: combinationDetails, quantity: 1 };
    });
    const modifiedResponse = modifiedData.reduce((result, item) => {
      const combinationDetails = item.combination_details || '{}';
      const combiData = JSON.parse(item.combination) || '{}';
      if (item.variantId === null) {
        const addonData = {
          addonId: item.addonId,
          addonVariantId: item.addonVariantId,
          addon_group_name: item.addon_group_name || '',
          minimum_item: item.minimum_item || '',
          maximum_item: item.maximum_item || '',
          addonItems: [],
        };
        const addonItemData = {
          addonItemId: item.addonItemId,
          addon_item_name: item.addon_item_name || '',
          addon_item_price: item.addon_item_price || '',
          addon_item_type: item.addon_item_type || '',
        };
        addonData.addonItems.push(addonItemData);
        const existingItem = result.find((existing) => existing.id === item.id);
        if (existingItem) {
          if (!existingItem.addons) {
            existingItem.addons = [];
          }
          const existingAddon = existingItem.addons.find(
            (addon) =>
              addon.addonId === addonData.addonId &&
              addon.addonVariantId === addonData.addonVariantId
          );
          if (!existingAddon) {
            existingItem.addons.push(addonData);
          }
          if (existingAddon) {
            if (!existingAddon.addonItems) {
              existingAddon.addonItems = [];
            }
            const existingAddonItem = existingAddon.addonItems.find(
              (addonItem) => addonItem.addonItemId === addonItemData.addonItemId
            );
            if (!existingAddonItem) {
              existingAddon.addonItems.push(addonItemData);
            }
          }
        } else {
          result.push({
            id: item.id,
            name: item.name,
            menu_id: item.menu_id,
            price: item.price,
            proprice: item.proprice,
            tax_percent: item.tax_percent,
            tax_type: item.tax_type,
            product_type: item.product_type,
            dine_in_service: item.dine_in_service,
            delivery_service: item.delivery_service,
            pick_up_service: item.pick_up_service,
            min_order_quantity: item.min_order_quantity,
            quantity: item.quantity,
            packaging_charges: item.packaging_charges,
            variants: [],
            attributes: [],
            addons: addonData.addonId ? [addonData] : [],
          });
        }
      } else {
        const variantDetails = {
          variantId: item.variantId,
          combination: combiData,
          combination_details: combinationDetails,
          combination_price: item.combination_price,
        };
        const attributeData = {
          attributeId: item.attributeId,
          attributeName: item.attributeName,
          attributeValueId: item.attributeValueId,
          attributeValue: item.attributeValue,
          attributePrice: item.attributePrice,
        };
        const addonData = {
          addonId: item.addonId,
          addonVariantId: item.addonVariantId,
          addon_group_name: item.addon_group_name || '',
          minimum_item: item.minimum_item || '',
          maximum_item: item.maximum_item || '',
          addonItems: [],
        };
        const addonItemData = {
          addonItemId: item.addonItemId,
          addon_item_name: item.addon_item_name || '',
          addon_item_price: item.addon_item_price || '',
          addon_item_type: item.addon_item_type || '',
        };
        const existingItem = result.find((existing) => existing.id === item.id);
        if (existingItem) {
          const existingVariant = existingItem.variants.find(
            (v) => v.variantId === variantDetails.variantId
          );
          if (!existingVariant) {
            existingItem.variants.push(variantDetails);
          }
          const existingAttribute = existingItem.attributes.find(
            (a) =>
              a.attributeId === attributeData.attributeId &&
              a.attributeValueId === attributeData.attributeValueId
          );
          if (!existingAttribute) {
            existingItem.attributes.push(attributeData);
          }
          if (!existingItem.addons) {
            existingItem.addons = [];
          }
          const existingAddon = existingItem.addons.find(
            (addon) =>
              addon.addonId === addonData.addonId &&
              addon.addonVariantId === addonData.addonVariantId
          );
          if (!existingAddon) {
            existingItem.addons.push(addonData);
          }
          if (existingAddon) {
            if (!existingAddon.addonItems) {
              existingAddon.addonItems = [];
            }
            const existingAddonItem = existingAddon.addonItems.find(
              (addonItem) => addonItem.addonItemId === addonItemData.addonItemId
            );
            if (!existingAddonItem) {
              existingAddon.addonItems.push(addonItemData);
            }
          }
        } else {
          result.push({
            id: item.id,
            name: item.name,
            menu_id: item.menu_id,
            price: item.price,
            proprice: item.proprice,
            tax_percent: item.tax_percent,
            tax_type: item.tax_type,
            product_type: item.product_type,
            dine_in_service: item.dine_in_service,
            delivery_service: item.delivery_service,
            pick_up_service: item.pick_up_service,
            min_order_quantity: item.min_order_quantity,
            quantity: item.quantity,
            packaging_charges: item.packaging_charges,
            variants: [variantDetails],
            attributes: [attributeData],
            addons: [addonData],
          });
        }
      }
      return result;
    }, []);

    // 6. Service Charge
    let service_charge_details = {};
    if (serviceChargeDetailsResult.length > 0) {
      for (const row of serviceChargeDetailsResult) {
        if (row.tax2_name) {
          service_charge_details.name = row.tax2_name;
          service_charge_details.percentage = row.tax2_value;
        }
      }
    }

    // 7. Tax Details
    let taxDetailsResult = [];
    if (req.staff.gst_type === 0 && req.staff.gstin) {
      const [taxRows] = await pool.query(
        `SELECT 
          'CGST' AS name, 
          tax1_value / 2 AS percentage, 0 AS amount 
          FROM fooders_details 
          WHERE fooder_id = ?
          UNION ALL
          SELECT 
          'SGST' AS name, 
          tax1_value / 2 AS percentage,0 AS amount 
          FROM fooders_details 
          WHERE fooder_id = ?;`,
        [fooder_id, fooder_id]
      );
      taxDetailsResult = taxRows;
    }

    // 8. Attributes
    const formattedData = totalAttribute.reduce((result, row) => {
      const existingAttribute = result.find(
        (item) => item.attribute_id === row.attribute_id
      );
      if (!existingAttribute) {
        result.push({
          attribute_id: row.attribute_id,
          attribute_name: row.attribute_name,
          values: [
            {
              attribute_value_id: row.attribute_value_id.toString(),
              attribute_value_name: row.attribute_value_name,
            },
          ],
        });
      } else {
        existingAttribute.values.push({
          attribute_value_id: row.attribute_value_id.toString(),
          attribute_value_name: row.attribute_value_name,
        });
      }
      return result;
    }, []);

    // 9. Fooder Details
    const fooderDetails = fDetailsResult[0] || {};

    // 10. Send response
    return res.status(200).send({
      status: 'success',
      product: modifiedResponse,
      menus: getposAllMenusDetailsResult,
      table_details: tableNameResult,
      fooder_id: req.staff.fooder_id,
      fooder_name: req.staff.fooder_name,
      fooder_gstin: req.staff.gstin,
      fssai_number: req.staff.fssai_number,
      f_address: fooderDetails.address || '',
      f_landline: fooderDetails.landline || '',
      f_city: fooderDetails.city || '',
      f_state: fooderDetails.state || '',
      f_zipcode: fooderDetails.zipcode || '',
      billing_notes: fooderDetails.billing_notes || '',
      Fooder_name2: fooderDetails.name2 || '',
      service_charge_details: service_charge_details,
      tax_Details: taxDetailsResult,
      customerDetails: [],
      waiterDetails: getStaffDetailsResult,
      tblCategoryDetails: dataArray,
      property: formattedData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Internal server error',
      errors: error.toString(),
    });
  }
};