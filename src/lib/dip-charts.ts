// IMPORTANT: This file contains placeholder data for DIP charts.
// The data provided here is for demonstration purposes only and is NOT accurate
// for any real-world tank. You MUST replace this data with the official
// calibration chart data provided by your tank manufacturer to ensure
// accurate stock measurement.

import type { DipChartEntry } from "./types";

// Placeholder chart for a 16KL (16,000 Litre) tank
// Assuming a max dip of 250 cm
export const dipChart16kl: DipChartEntry[] = Array.from({ length: 26 }, (_, i) => ({
  dip: i * 10,
  // This is a simplified linear approximation. Real charts are non-linear.
  volume: Math.round((16000 / 250) * (i * 10)),
}));

// Placeholder chart for a 21KL (21,000 Litre) tank
// Assuming a max dip of 300 cm
export const dipChart21kl: DipChartEntry[] = Array.from({ length: 31 }, (_, i) => ({
  dip: i * 10,
  // This is a simplified linear approximation. Real charts are non-linear.
  volume: Math.round((21000 / 300) * (i * 10)),
}));


const charts = {
    '16kl': dipChart16kl,
    '21kl': dipChart21kl,
}

/**
 * Calculates the volume from a dip reading using linear interpolation.
 * @param dipReading The dip reading in cm.
 * @param chartType The type of chart to use ('16kl' or '21kl').
 * @returns The calculated volume in Litres.
 */
export function getVolumeFromDip(dipReading: number, chartType: '16kl' | '21kl'): number {
  const chart = charts[chartType];
  if (!chart || chart.length === 0) {
    return 0;
  }

  // Find the two points surrounding the dip reading
  const lowerPoint = chart.slice().reverse().find(p => p.dip <= dipReading);
  const upperPoint = chart.find(p => p.dip >= dipReading);

  // Handle edge cases
  if (!lowerPoint) return 0; // Reading is below the chart's minimum
  if (!upperPoint) return chart[chart.length - 1].volume; // Reading is above the chart's maximum
  if (lowerPoint.dip === upperPoint.dip) return lowerPoint.volume; // Exact match

  // Perform linear interpolation
  const dipRange = upperPoint.dip - lowerPoint.dip;
  const volumeRange = upperPoint.volume - lowerPoint.volume;
  const dipFraction = (dipReading - lowerPoint.dip) / dipRange;

  const interpolatedVolume = lowerPoint.volume + (dipFraction * volumeRange);

  return Math.round(interpolatedVolume);
}
