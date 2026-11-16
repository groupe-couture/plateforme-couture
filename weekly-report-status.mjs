// Technical reporting activation does not erase previously entered reports.
export function beforeWeeklyReportingActivation(profile,period,existing){
 const start=profile?.reportingStartDate;
 return !existing&&/^\d{4}-\d{2}-\d{2}$/.test(start||'')&&typeof period?.periodEnd==='string'&&period.periodEnd<start;
}
