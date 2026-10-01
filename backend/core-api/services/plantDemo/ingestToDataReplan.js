import { PLANT_DEMO_LINE_ID } from './constants.js';

/**
 * Maps BFF ingest bodies to Camilo Data API `POST /schedule/replan` request shape.
 * Same JSON is sent when DATA_API_BASE_URL is configured.
 */

function parseLocale(locale) {
  if (locale === 'es' || locale === 'en') return locale;
  return 'en';
}

/**
 * @param {Record<string, unknown>} body — BFF ingest sap-priority-change
 */
export function dataReplanRequestFromSapIngest(body) {
  const lineId = typeof body.lineId === 'string' ? body.lineId : PLANT_DEMO_LINE_ID;
  const po = typeof body.po === 'string' ? body.po : '1002307551';
  return {
    type: 'rush',
    lineId,
    locale: parseLocale(body.locale),
    focusPo: po,
    trigger: 'priority_change',
    ingest: {
      source: 'sap_priority_change',
      po,
      priority: body.priority,
      scheduledFinish: body.scheduledFinish,
    },
  };
}

/**
 * @param {Record<string, unknown>} body — BFF ingest pass-fail-log
 */
export function dataReplanRequestFromPassFailIngest(body) {
  const lineId = typeof body.lineId === 'string' ? body.lineId : PLANT_DEMO_LINE_ID;
  const po = typeof body.po === 'string' ? body.po : '1001884747';
  return {
    type: 'qa_fail',
    lineId,
    locale: parseLocale(body.locale),
    focusPo: po,
    trigger: 'pass_fail_log',
    ingest: {
      source: 'pass_fail_log',
      po,
      passFail: body.passFail ?? body.pass_fail,
      failedFor: body.failedFor ?? body.failed_for,
      equipmentId: body.equipmentId ?? body.equipment_id,
    },
  };
}

/** Syngenta surprise rush — new PO on a COISPI refresh. */
export function dataReplanRequestFromSapQueueRefresh(body) {
  const lineId = typeof body.lineId === 'string' ? body.lineId : PLANT_DEMO_LINE_ID;
  const po = typeof body.po === 'string' ? body.po : '1002408120';
  return {
    type: 'rush',
    lineId,
    locale: parseLocale(body.locale),
    focusPo: po,
    trigger: 'sap_queue_refresh',
    ingest: {
      source: 'sap_queue_refresh',
      po,
      species: body.species,
      kg: body.kg,
      finish: body.finish,
      scheduledFinish: body.scheduledFinish ?? body.finish,
      priority: body.priority ?? 2,
      customerOrderId: body.customerOrderId,
    },
  };
}

