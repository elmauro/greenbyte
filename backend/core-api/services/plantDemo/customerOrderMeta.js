/** Demo proxies for Syngenta “open customer orders” — replace with ETL joins later. */
export const CUSTOMER_ORDER_BY_PO = {
  '1002307551': { customerOrderId: 'CO-44821', customerWindow: '2026-07-06' },
  '1001884747': { customerOrderId: 'CO-44102', customerWindow: '2026-07-05' },
  '1002174855': { customerOrderId: 'CO-51202', customerWindow: '2026-07-10' },
  '1002408120': { customerOrderId: 'CO-51999', customerWindow: '2026-07-07' },
};

export function customerMetaForPo(po) {
  return CUSTOMER_ORDER_BY_PO[po] ?? null;
}

export function appendCustomerReason(reasons, po) {
  if (customerMetaForPo(po)) {
    reasons.push('customer_order');
  }
}
