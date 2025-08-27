import axiosInstance from './axiosinstance';
import Toaster from './Toaster';

/**
 * Switches a table according to business rules.
 * @param {Object} params
 * @param {Object} params.currentTable - The current table object.
 * @param {Object} params.targetTable - The table to switch to.
 * @param {string|number} params.orderId - The order id if present.
 * @param {Array} params.kotArray - Array of KOT ids (numbers).
 * @param {Function} params.setSelectedTable - State setter for selectedTable.
 * @param {Function} [params.onSuccess] - Optional callback on success.
 * @param {Function} [params.onError] - Optional callback on error.
 */
// export async function switchTable({



export async function switchTable({
  currentTable,
  targetTable,
  orderId,
  kotArray,
  setSelectedTable,
  onSuccess,
  onError,
}) {
  try {
    const oldId = currentTable.id || currentTable.table_id;
    const newId = targetTable.id || targetTable.table_id;
    const orderList = JSON.parse(localStorage.getItem('orderList')) || {};

    console.log(targetTable,"targetTable");
    

    let didApi = false;

    // If there are KOT ids, call the KOT update API
    if (kotArray && kotArray.length > 0) {
      const payloadKOT = {
        old_table_id: oldId,
        new_table_id: newId,
      };
      await axiosInstance.put('/api/table/switchtable', payloadKOT);
      didApi = true;
    }

    // If there is an orderId, call the POS update API
    if (orderId) {
      Toaster.error("can't switch after order is generated...")
    }

    // If no KOT and no orderId, do a local switch
    if (!didApi) {
      if (orderList[oldId]) {
        orderList[newId] = { ...orderList[oldId], table_id: newId };
        delete orderList[oldId];
        localStorage.setItem('orderList', JSON.stringify(orderList));
      }
      setSelectedTable(targetTable);
      if (onSuccess) onSuccess();
      Toaster.success('Table Switched Successfully');
      return;
    } else {
      // If APIs were called, just delete the old tableId's data from localStorage
      if (orderList[oldId]) {
        delete orderList[oldId];
        localStorage.setItem('orderList', JSON.stringify(orderList));
      }
    }

    setSelectedTable(targetTable);
    if (onSuccess) onSuccess();
    Toaster.success('Table switched successfully.');
  } catch (err) {
    Toaster.error('Failed to switch table');
    console.log(err);
    if (onError) onError(err);
  }
} 