// export const BaseURL = 'https://staffposapi.shunyape.com';
export const BaseURL = 'https://posapi.scanka.com';
// export const BaseURL = 'http://localhost:3111';
// export const BaseURL = 'https://pos-api.vayulabs.shop';
// export const BaseURL = 'https://staffapi.khateraho.com';

export const loginAPI = `${BaseURL}/api/auth/login`;
export const getStaff = `${BaseURL}/api/auth/me`;
export const logoutAPI = `${BaseURL}/api/auth/logout`;
export const AllProduct = `${BaseURL}/api/products/all`;
export const PassCodeAPI = `${BaseURL}/api/staff/details`;
export const DeleteKOTGeneratedItemURL = `${BaseURL}/api/kot/remove-item`;
export const SetledAndUnsetledAmount = `${BaseURL}/api/report/getSettledUnsettledReportDaily`;
export const ReportsDataAPI = `${BaseURL}/api/report/salesReportDaily`;
export const KotGetAPI = `${BaseURL}/api/kot/get-today-kot`;
export const LiveOrderGetAPI = `${BaseURL}/api/order/liveorder`;
export const OrderDetailsGetAPI = `${BaseURL}/api/order/getorderdetails`;
export const GET_EATER_DETAILS = "/api/eaters/geteatersdetails";
export const VoidBillAPI = `${BaseURL}/api/order/voidbill`;
export const GetOrderItemsSpilitBill = `${BaseURL}/api/splitbill/getorderitems`;
export const SaveSplitBillPost = `${BaseURL}/api/splitbill/createbill`;
export const PostSplitBill = `${BaseURL}/api/splitbill/getsplitbillitems`;
export const SplitBillPaid = `${BaseURL}/api/splitbill/marksplitbillpaid`;
export const CancelSplitBill = `${BaseURL}/api/splitbill/cancellbill`;
export const UpdateDetailsTabPost = `${BaseURL}/api/eaters/updateeaterdetails`;
export const GetGSTReportURL = `${BaseURL}/api/report/gstReport`;
export const GetItemReport = `${BaseURL}/api/report/getItemsReportDetails`;
export const GetCustomisedSalesReportURL = `${BaseURL}/api/report/customisedSalesReport`;
export const GetAllProductsNameURL = `${BaseURL}/api/products/GetAllProductsName`;
export const GetReportByOrderTypeURL = `${BaseURL}/api/report/orderReport`;
export const GetAllCouponCodeName = `${BaseURL}/api/report/GetAllCouponCodeName`;
export const GetAllCouponReport = `${BaseURL}/api/report/getOrderCopounReportDetails`;
export const UpdateOrderStatus = `${BaseURL}/api/alertify/updateLiveOrderAction`;
export const PostSaveKot = `${BaseURL}/api/kot/generate`;
export const PostCreateOrderForDeliveryAndTakeAway = `${BaseURL}/api/order/createorderfordeliveryandtakeaway`;
export const PostCreateOrder = `${BaseURL}/api/order/createorder`;
export const PostAfterOrderGenerateUpdateNewItem = `${BaseURL}/api/order/afterordergenerateupdatenewitem`;
export const PostPartialPaymentForDineIn = `${BaseURL}/api/payment/partialpaymentfordinein`;
export const PostPosPaymentForDeliveryAndPickUp = `${BaseURL}/api/payment/posPaymentForDelivaryAndPickUp`;
export const PostHoldPaymentForDineIn = `${BaseURL}/api/payment/holdpaymentfordinein`;
export const PostHoldPaymentForCounterAndDelivery = `${BaseURL}/api/payment/holdpaymentforcounteranddelivery`;
export const PostIncreaseItemQuantity = `${BaseURL}/api/kot/increase-item-quantity`;
export const PostDecreaseItemQuantity = `${BaseURL}/api/kot/decrease-item-quantity`;




 
