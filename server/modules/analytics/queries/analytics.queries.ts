export const analyticsQueries = {
  latestDailySnapshot: `
    WITH daily_agg AS (
      SELECT
        site_id,
        MAX(measurement_date) AS measurement_date,
        AVG(flow_supply) AS flow_supply,
        AVG(flow_return) AS flow_return,
        AVG(makeup_water) AS makeup_water,
        AVG(energy_release) AS energy_release,
        SUM(CASE WHEN is_valid = 0 THEN 1 ELSE 0 END) AS invalid_points
      FROM dbo.vzlet_daily_telemetry
      WHERE measurement_date BETWEEN @startDate AND @endDate
      GROUP BY site_id
    )
    SELECT * FROM daily_agg;
  `,
  missingDataObjects: `
    SELECT TOP (@limit)
      site_id,
      site_name,
      DATEDIFF(DAY, MAX(measurement_date), SYSUTCDATETIME()) AS missing_days,
      MAX(measurement_date) AS last_measurement
    FROM dbo.vzlet_daily_telemetry
    GROUP BY site_id, site_name
    HAVING DATEDIFF(DAY, MAX(measurement_date), SYSUTCDATETIME()) >= 3
    ORDER BY missing_days DESC;
  `,
  massBalanceWindow: `
    SELECT
      AVG(flow_supply) AS avg_supply,
      AVG(flow_return) AS avg_return
    FROM dbo.vzlet_daily_telemetry
    WHERE measurement_date BETWEEN @startDate AND @endDate;
  `,
};
