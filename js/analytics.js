// Broadcast Miraya Analytics & Chart Renderer

class AnalyticsManager {
  static calculateOverviewStats(campaigns, customers) {
    const totalCustomers = customers.length;
    const totalCampaigns = campaigns.length;

    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;

    campaigns.forEach(c => {
      totalSent += c.sent || 0;
      totalDelivered += c.delivered || 0;
      totalRead += c.read || 0;
    });

    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

    return {
      totalCustomers,
      totalCampaigns,
      totalSent,
      totalDelivered,
      totalRead,
      readRate,
      deliveryRate
    };
  }

  // Render SVG Donut Chart for delivery breakdown
  static renderDeliveryDonutChart(containerId, sent, delivered, read, failed) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = (sent || 0) + (failed || 0);
    if (total === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No campaign dispatch data available yet</div>`;
      return;
    }

    const readPct = Math.round((read / total) * 100);
    const delivOnlyPct = Math.round(((delivered - read) / total) * 100);
    const sentOnlyPct = Math.round(((sent - delivered) / total) * 100);
    const failedPct = Math.round((failed / total) * 100);

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap: 1rem;">
        <div style="position:relative; width: 140px; height: 140px;">
          <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3.8"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--status-read)" stroke-width="4" stroke-dasharray="${readPct}, 100" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--status-delivered)" stroke-width="4" stroke-dasharray="${delivOnlyPct}, 100" stroke-dashoffset="-${readPct}" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--status-failed)" stroke-width="4" stroke-dasharray="${failedPct}, 100" stroke-dashoffset="-${readPct + delivOnlyPct + sentOnlyPct}" />
          </svg>
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
            <div style="font-size:1.3rem; font-weight:bold; color:var(--text-main);">${readPct}%</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Read Rate</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--status-read);"></span>
            <span>Read: <strong>${read}</strong> (${readPct}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--status-delivered);"></span>
            <span>Delivered: <strong>${delivered - read}</strong> (${delivOnlyPct}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--status-sent);"></span>
            <span>Sent: <strong>${sent - delivered}</strong> (${sentOnlyPct}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--status-failed);"></span>
            <span>Failed: <strong>${failed}</strong> (${failedPct}%)</span>
          </div>
        </div>
      </div>
    `;
  }
}
