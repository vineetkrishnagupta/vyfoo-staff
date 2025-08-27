/**
 * Utility functions for billing calculations
 * Based on logic from OrderSidebar.jsx
 */

/**
 * Calculate billing summary with all components
 * @param {Array} orderItems - Array of order items
 * @param {Object} discount - Discount configuration {mode: 0|1, value: number}
 * @param {Object} serviceCharge - Service charge configuration {name: string, percentage: number}
 * @param {Object} options - Additional options {orderMode: string, isNC: boolean}
 * @returns {Object} Complete billing summary
 */
// export const calculateBillingSummary = (orderItems = [], discount = {mode: 0, value: 0}, serviceCharge = {percentage: 0}, options = {}) => {
//   const { orderMode = 'DINE IN', isNC = false } = options;
//     // Helper function to calculate subtotal
//   const calculateSubtotal = () => {
//     return orderItems.reduce((total, item) => {
//       // Calculate withOutTaxPrice based on tax_type
//       let withOutTaxPrice;
//       if (item.withOutTaxPrice !== undefined) {
//         // Use existing withOutTaxPrice if available
//         withOutTaxPrice = item.withOutTaxPrice;
//       } else {
//         // Calculate based on tax_type and price
//         const price = parseFloat(item.product_price || item.price || 0);
//         const taxPercent = parseFloat(item.item_tax_percent || item.tax_percent || 0);
//         const taxType = parseInt(item.item_tax_type || item.tax_type || 0);
        
//         if (taxType === 0) {
//           // Tax excluded: price is without tax
//           withOutTaxPrice = price;
//         } else {
//           // Tax included: extract base price from total price
//           withOutTaxPrice = taxPercent > 0 ? (price * 100) / (100 + taxPercent) : price;
//         }
//       }
      
//       return total + withOutTaxPrice * (item.quantity || 1);
//     }, 0);
//   };

//   // Helper function to calculate discount amount
//   const calculateDiscountAmount = (subtotal, discountConfig) => {
//     if (subtotal <= 0) return 0;
    
//     const { mode = 0, value = 0 } = discountConfig;
    
//     if (mode === 0) {
//       // Percentage mode
//       return (subtotal * value) / 100;
//     } else {
//       // Flat amount mode
//       return Math.min(value, subtotal);
//     }
//   };

//   // Helper function to calculate service charge amount
//   const calculateServiceChargeAmount = (subtotalAfterDiscount, serviceChargeConfig) => {
//     const percent = serviceChargeConfig?.percentage ?? 0;
//     return subtotalAfterDiscount > 0 ? (subtotalAfterDiscount * percent) / 100 : 0;
//   };

//   // Helper function to calculate packaging charges
//   const calculatePackagingCharges = (items, mode, isNCOrder) => {
//     if (mode !== 'DELIVER' && mode !== 'COUNTER') return 0;
//     if (isNCOrder) return 0; // Exclude packaging charges for NC orders
    
//     return items.reduce((sum, item) => {
//       return sum + (parseFloat(item.packaging_charges || 0) * (item.quantity || 1));
//     }, 0);
//   };
//   // Helper function to calculate tax slab wise
//   const calculateTaxSlabWise = (items, subtotal, discountAmount, serviceChargeAmount, serviceChargeConfig) => {
//     const subtotalAfterDiscount = subtotal - discountAmount;
//     const taxSlabs = {};
//     let totalTax = 0;

//     // Get unique tax percentages
//     const uniquePercents = Array.from(new Set(items.map((item) => 
//       parseFloat(item.item_tax_percent || item.tax_percent || 0)
//     ).filter(Boolean)));

//     uniquePercents.forEach(percent => {
//       const itemsInGroup = items.filter((item) => 
//         parseFloat(item.item_tax_percent || item.tax_percent || 0) === percent
//       );
      
//       const taxForThisPercent = itemsInGroup.reduce((sum, item) => {
//         // Calculate withOutTaxPrice for this item
//         let itemWithOutTaxPrice;
//         if (item.withOutTaxPrice !== undefined) {
//           itemWithOutTaxPrice = item.withOutTaxPrice;
//         } else {
//           const price = parseFloat(item.product_price || item.price || 0);
//           const taxPercent = parseFloat(item.item_tax_percent || item.tax_percent || 0);
//           const taxType = parseInt(item.item_tax_type || item.tax_type || 0);
          
//           if (taxType === 0) {
//             // Tax excluded: price is without tax
//             itemWithOutTaxPrice = price;
//           } else {
//             // Tax included: extract base price from total price
//             itemWithOutTaxPrice = taxPercent > 0 ? (price * 100) / (100 + taxPercent) : price;
//           }
//         }
        
//         // Proportional discount for this item
//         const itemBasePrice = itemWithOutTaxPrice * (item.quantity || 1);
//         const itemDiscount = subtotal > 0 ? (itemBasePrice / subtotal) * discountAmount : 0;
//         const itemPriceAfterDiscount = itemBasePrice - itemDiscount;
        
//         // Add proportional service charge if present
//         let itemTaxBase = itemPriceAfterDiscount;
//         if (serviceChargeConfig && serviceChargeConfig.percentage != null) {
//           const itemSCH = subtotalAfterDiscount > 0 ? (itemPriceAfterDiscount / subtotalAfterDiscount) * serviceChargeAmount : 0;
//           itemTaxBase += itemSCH;
//         }
        
//         return sum + (itemTaxBase * percent) / 100;
//       }, 0);

//       if (taxForThisPercent > 0) {
//         // Split into CGST and SGST (half each)
//         const cgstRate = percent / 2;
//         const sgstRate = percent / 2;
//         const cgstAmount = taxForThisPercent / 2;
//         const sgstAmount = taxForThisPercent / 2;

//         taxSlabs[`CGST@${cgstRate}%`] = cgstAmount;
//         taxSlabs[`SGST@${sgstRate}%`] = sgstAmount;
        
//         totalTax += taxForThisPercent;
//       }
//     });

//     return { taxSlabs, totalTax };
//   };

//   // Helper function to calculate round off
//   const calculateRoundOff = (rawTotal) => {
//     const decimal = rawTotal - Math.floor(rawTotal);
//     return decimal >= 0.5 ? +(1 - decimal).toFixed(2) : -decimal.toFixed(2);
//   };

//   // Main calculations
//   const subtotal = calculateSubtotal();
//   const discountAmount = calculateDiscountAmount(subtotal, discount);
//   const subtotalAfterDiscount = subtotal - discountAmount;
//   const serviceChargeAmount = calculateServiceChargeAmount(subtotalAfterDiscount, serviceCharge);
//   const packagingCharges = calculatePackagingCharges(orderItems, orderMode, isNC);
//   const { taxSlabs, totalTax } = calculateTaxSlabWise(orderItems, subtotal, discountAmount, serviceChargeAmount, serviceCharge);
  
//   // Calculate final total
//   const rawTotal = subtotal - discountAmount + serviceChargeAmount + totalTax + packagingCharges;
//   const roundOffValue = calculateRoundOff(rawTotal);
//   const finalTotal = rawTotal + roundOffValue;

//   // Return comprehensive summary
//   return {
//     itemsCount: orderItems.length,
//     subtotal: parseFloat(subtotal.toFixed(2)),
//     discount: {
//       mode: discount.mode || 0,
//       value: discount.value || 0,
//       amount: parseFloat(discountAmount.toFixed(2)),
//       description: discount.mode === 0 ? `${discount.value}%` : `₹${discount.value}`
//     },
//     serviceCharge: {
//       name: serviceCharge.name || 'Service Charge',
//       percentage: serviceCharge.percentage || 0,
//       amount: parseFloat(serviceChargeAmount.toFixed(2))
//     },
//     packagingCharges: parseFloat(packagingCharges.toFixed(2)),
//     taxSlabs: Object.keys(taxSlabs).map(key => ({
//       name: key,
//       amount: parseFloat(taxSlabs[key].toFixed(2))
//     })),
//     totalTax: parseFloat(totalTax.toFixed(2)),
//     roundOff: parseFloat(roundOffValue.toFixed(2)),
//     total: parseFloat(finalTotal.toFixed(2)),
//     // Additional breakdown for reference
//     breakdown: {
//       subtotal,
//       discountAmount,
//       subtotalAfterDiscount,
//       serviceChargeAmount,
//       packagingCharges,
//       totalTax,
//       rawTotal,
//       roundOffValue,
//       finalTotal
//     }
//   };
// };

export const calculateBillingSummary = (
  orderItems = [],
  discountData = { mode: 0, value: 0 },
  serviceChargeData = { name: 'SCH', percentage: 0 },
  meta = { orderMode: 'DINE IN', isNC: false }
) => {
  // Calculate subtotal (base amount without tax)
  let subtotal = 0;
  const itemsWithTaxInfo = [];

  // First pass: Calculate subtotal and gather tax info
  for (const item of orderItems) {
    const price = Number(item.product_price || item.price || 0);
    const taxPercent = Number(item.item_tax_percent || item.tax_percent || 0);
    const quantity = Number(item.quantity || 1);
    const taxType = Number(item.item_tax_type || item.tax_type || 0); // 0 = tax excluded, 1 = tax included

    let itemSubtotal = 0;

    if (taxType === 0) {
      // Tax Excluded: price is without tax
      itemSubtotal = price * quantity;
    } else {
      // Tax Included: extract base price from total price
      const basePrice = taxPercent > 0 ? price / (1 + taxPercent / 100) : price;
      itemSubtotal = basePrice * quantity;
    }

    subtotal += itemSubtotal;
    itemsWithTaxInfo.push({
      ...item,
      itemSubtotal,
      taxPercent,
      quantity
    });
  }

  // Apply discount
  let discountAmount = 0;
  if (discountData.mode === 0) {
    // Percentage discount
    discountAmount = (subtotal * Number(discountData.value || 0)) / 100;
  } else if (discountData.mode === 1) {
    // Fixed amount discount
    discountAmount = Number(discountData.value || 0);
  }

  const subtotalAfterDiscount = subtotal - discountAmount;

  // Apply service charge on subtotal after discount
  let serviceCharge = 0;
  if (serviceChargeData?.percentage) {
    serviceCharge = (subtotalAfterDiscount * Number(serviceChargeData.percentage)) / 100;
  }

  // Calculate packaging charges
  let packagingCharges = 0;
  if ((meta.orderMode === 'DELIVERY' || meta.orderMode === 'COUNTER') && !meta.isNC) {
    packagingCharges = orderItems.reduce((sum, item) => {
      return sum + (parseFloat(item.packaging_charges || item.packaging_fee || 0) * (item.quantity || 1));
    }, 0);
  }

  // Calculate tax on the adjusted base (after discount + service charge)
  const taxSlabs = {};
  let finalTaxTotal = 0;

  // Group items by tax percentage
  const taxGroups = {};
  itemsWithTaxInfo.forEach(item => {
    if (item.taxPercent > 0) {
      if (!taxGroups[item.taxPercent]) {
        taxGroups[item.taxPercent] = [];
      }
      taxGroups[item.taxPercent].push(item);
    }
  });

  // Calculate tax for each group
  for (const [percentStr, items] of Object.entries(taxGroups)) {
    const taxPercent = Number(percentStr);
    
    // Calculate the base amount for this tax group
    const groupSubtotal = items.reduce((sum, item) => sum + item.itemSubtotal, 0);
    
    // Apply proportional discount to this group
    const groupDiscount = subtotal > 0 ? (groupSubtotal / subtotal) * discountAmount : 0;
    const groupAfterDiscount = groupSubtotal - groupDiscount;
    
    // Apply proportional service charge to this group
    const groupServiceCharge = subtotalAfterDiscount > 0 ? (groupAfterDiscount / subtotalAfterDiscount) * serviceCharge : 0;
    
    // Tax base = item price after discount + proportional service charge
    const taxBase = groupAfterDiscount + groupServiceCharge;
    
    // Calculate tax amount
    const taxAmount = (taxBase * taxPercent) / 100;
    
    if (taxAmount > 0) {
      taxSlabs[taxPercent] = taxAmount;
      finalTaxTotal += taxAmount;
    }
  }

  // Create final tax slabs (split CGST/SGST)
  const finalTaxSlabs = [];

  for (const [percentStr, amount] of Object.entries(taxSlabs)) {
    const percent = Number(percentStr);
    if (percent > 0 && amount > 0) {
      const halfPercent = percent / 2;
      const halfAmount = amount / 2;

      finalTaxSlabs.push({ 
        name: `CGST`, 
        percentage: halfPercent, 
        amount: +halfAmount.toFixed(2) 
      });
      finalTaxSlabs.push({ 
        name: `SGST`, 
        percentage: halfPercent, 
        amount: +halfAmount.toFixed(2) 
      });
    }
  }

  // Calculate final total
  const rawTotal = subtotalAfterDiscount + serviceCharge + finalTaxTotal + packagingCharges;
  // const roundOffValue = Math.round(rawTotal) - rawTotal;
  const roundOffValue = 0;

  // const roundOffValue =0;

  
  // const total = Math.round(rawTotal);
  const total =  (rawTotal);


  // If order is NC (No Charge)
  if (meta.isNC) {
    return {
      itemsCount: orderItems.length,
      subtotal: 0,
      discount: {
        mode: discountData.mode || 0,
        value: discountData.value || 0,
        amount: 0,
        description: 'NC Order'
      },
      serviceCharge: {
        name: serviceChargeData?.name || 'SCH',
        percentage: 0,
        amount: 0
      },
      packagingCharges: 0,
      taxSlabs: [],
      totalTax: 0,
      roundOff: 0,
      total: 0
    };
  }

  return {
    itemsCount: orderItems.length,
    subtotal: +subtotal.toFixed(2),
    discount: {
      mode: discountData.mode || 0,
      value: discountData.value || 0,
      amount: +discountAmount.toFixed(2),
      description: discountData.mode === 0 ? `${parseFloat(discountData.value).toFixed(2) || 0}%` : `₹${discountData.value || 0}`
    },
    serviceCharge: {
      name: serviceChargeData?.name || 'SCH',
      percentage: serviceChargeData?.percentage || 0,
      amount: +serviceCharge.toFixed(2)
    },
    packagingCharges: +packagingCharges.toFixed(2),
    taxSlabs: finalTaxSlabs,
    totalTax: +finalTaxTotal.toFixed(2),
    roundOff: +roundOffValue.toFixed(2),
    total: +total.toFixed(2),
    // Additional breakdown for debugging
    breakdown: {
      originalSubtotal: subtotal,
      discountAmount,
      subtotalAfterDiscount,
      serviceCharge,
      packagingCharges,
      taxTotal: finalTaxTotal,
      rawTotal,
      roundOffValue
    }
  };
};




/**
 * Calculate only subtotal from order items
 * @param {Array} orderItems - Array of order items
 * @returns {number} Subtotal amount
 */
export const calculateSubtotal = (orderItems = []) => {
  return orderItems.reduce((total, item) => {
    // Calculate withOutTaxPrice based on tax_type
    let withOutTaxPrice;
    if (item.withOutTaxPrice !== undefined) {
      // Use existing withOutTaxPrice if available
      withOutTaxPrice = item.withOutTaxPrice;
    } else {
      // Calculate based on tax_type and price
      const price = parseFloat(item.product_price || item.price || 0);
      const taxPercent = parseFloat(item.item_tax_percent || item.tax_percent || 0);
      const taxType = parseInt(item.item_tax_type || item.tax_type || 0);
      
      if (taxType === 0) {
        // Tax excluded: price is without tax
        withOutTaxPrice = price;
      } else {
        // Tax included: extract base price from total price
        withOutTaxPrice = taxPercent > 0 ? (price * 100) / (100 + taxPercent) : price;
      }
    }
    
    return total + withOutTaxPrice * (item.quantity || 1);
  }, 0);
};

/**
 * Calculate discount amount based on mode and value
 * @param {number} subtotal - Subtotal amount
 * @param {number} discountMode - 0 for percentage, 1 for flat amount
 * @param {number} discountValue - Discount value
 * @returns {number} Discount amount
 */
export const calculateDiscount = (subtotal, discountMode = 0, discountValue = 0) => {
  if (subtotal <= 0) return 0;
  
  if (discountMode === 0) {
    // Percentage mode
    return (subtotal * discountValue) / 100;
  } else {
    // Flat amount mode
    return Math.min(discountValue, subtotal);
  }
};

/**
 * Calculate service charge amount
 * @param {number} subtotalAfterDiscount - Subtotal after discount
 * @param {number} serviceChargePercentage - Service charge percentage
 * @returns {number} Service charge amount
 */
export const calculateServiceCharge = (subtotalAfterDiscount, serviceChargePercentage = 0) => {
  return subtotalAfterDiscount > 0 ? (subtotalAfterDiscount * serviceChargePercentage) / 100 : 0;
};

/**
 * Calculate packaging charges for delivery/counter orders
 * @param {Array} orderItems - Array of order items
 * @param {string} orderMode - Order mode (DELIVER, COUNTER, DINE IN)
 * @param {boolean} isNC - Whether it's a NC (No Charge) order
 * @returns {number} Total packaging charges
 */
export const calculatePackagingCharges = (orderItems = [], orderMode = 'DINE IN', isNC = false) => {
  if (orderMode !== 'DELIVERY' && orderMode !== 'COUNTER') return 0;
  if (isNC) return 0; // Exclude packaging charges for NC orders
  
  return orderItems.reduce((sum, item) => {
    return sum + (parseFloat(item.packaging_charges || 0) * (item.quantity || 1));
  }, 0);
};

/**
 * Get tax breakdown by slabs
 * @param {Array} orderItems - Array of order items
 * @param {number} subtotal - Subtotal amount
 * @param {number} discountAmount - Total discount amount
 * @param {number} serviceChargeAmount - Service charge amount
 * @param {Object} serviceChargeConfig - Service charge configuration
 * @returns {Object} Tax breakdown with slabs and total
 */
export const getTaxBreakdown = (orderItems = [], subtotal, discountAmount, serviceChargeAmount, serviceChargeConfig = {}) => {
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxSlabs = {};
  let totalTax = 0;

  // Get unique tax percentages
  const uniquePercents = Array.from(new Set(orderItems.map((item) => 
    parseFloat(item.item_tax_percent || item.tax_percent || 0)
  ).filter(Boolean)));

  uniquePercents.forEach(percent => {
    const itemsInGroup = orderItems.filter((item) => 
      parseFloat(item.item_tax_percent || item.tax_percent || 0) === percent
    );
    
    const taxForThisPercent = itemsInGroup.reduce((sum, item) => {
      // Calculate withOutTaxPrice for this item
      let itemWithOutTaxPrice;
      if (item.withOutTaxPrice !== undefined) {
        itemWithOutTaxPrice = item.withOutTaxPrice;
      } else {
        const price = parseFloat(item.product_price || item.price || 0);
        const taxPercent = parseFloat(item.item_tax_percent || item.tax_percent || 0);
        const taxType = parseInt(item.item_tax_type || item.tax_type || 0);
        
        if (taxType === 0) {
          // Tax excluded: price is without tax
          itemWithOutTaxPrice = price;
        } else {
          // Tax included: extract base price from total price
          itemWithOutTaxPrice = taxPercent > 0 ? (price * 100) / (100 + taxPercent) : price;
        }
      }
      
      // Proportional discount for this item
      const itemBasePrice = itemWithOutTaxPrice * (item.quantity || 1);
      const itemDiscount = subtotal > 0 ? (itemBasePrice / subtotal) * discountAmount : 0;
      const itemPriceAfterDiscount = itemBasePrice - itemDiscount;
      
      // Add proportional service charge if present
      let itemTaxBase = itemPriceAfterDiscount;
      if (serviceChargeConfig && serviceChargeConfig.percentage != null) {
        const itemSCH = subtotalAfterDiscount > 0 ? (itemPriceAfterDiscount / subtotalAfterDiscount) * serviceChargeAmount : 0;
        itemTaxBase += itemSCH;
      }
      
      return sum + (itemTaxBase * percent) / 100;
    }, 0);

    if (taxForThisPercent > 0) {
      // Split into CGST and SGST (half each)
      const cgstRate = percent / 2;
      const sgstRate = percent / 2;
      const cgstAmount = taxForThisPercent / 2;
      const sgstAmount = taxForThisPercent / 2;

      taxSlabs[`CGST@${cgstRate}%`] = cgstAmount;
      taxSlabs[`SGST@${sgstRate}%`] = sgstAmount;
      
      totalTax += taxForThisPercent;
    }
  });

  return { taxSlabs, totalTax };
};

/**
 * Calculate round off value
 * @param {number} rawTotal - Raw total before rounding
 * @returns {number} Round off value (positive or negative)
 */
export const calculateRoundOff = (rawTotal) => {
  const decimal = rawTotal - Math.floor(rawTotal);
  return decimal >= 0.5 ? +(1 - decimal).toFixed(2) : -decimal.toFixed(2);
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `₹${parseFloat(amount || 0).toFixed(2)}`;
};

/**
 * Example usage and test function
 */
export const testBillCalculations = () => {
  const sampleOrderItems = [
    {
      id: 1,
      name: "Butter Chicken",
      withOutTaxPrice: 300,
      quantity: 2,
      tax_percent: 5,
      packaging_charges: "10"
    },
    {
      id: 2,
      name: "Naan",
      withOutTaxPrice: 80,
      quantity: 3,
      tax_percent: 18,
      packaging_charges: "5"
    }
  ];

  const discount = { mode: 0, value: 10 }; // 10% discount
  const serviceCharge = { name: "Service Charge", percentage: 8 };
  const options = { orderMode: 'DELIVERY', isNC: false };

  const result = calculateBillingSummary(sampleOrderItems, discount, serviceCharge, options);
  
  console.log("Billing Summary Test:", result);
  return result;
};
