/**
 * Coverage Reporter
 * 
 * This file contains functionality to collect and report on test coverage.
 */

import fs from 'fs/promises';
import path from 'path';
import { serializeError } from 'serialize-error';

import { TestCoverage } from './testRunner.js';

/**
 * Interface for a file coverage report
 */
export interface FileCoverageReport {
  path: string;
  lines: {
    total: number;
    covered: number;
    percentage: number;
    uncoveredLines: number[];
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
    uncoveredFunctions: string[];
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
}

/**
 * Interface for a coverage report
 */
export interface CoverageReport {
  timestamp: string;
  summary: TestCoverage;
  files: FileCoverageReport[];
}

/**
 * Interface for coverage data structure from JSON file
 */
interface CoverageData {
  total: {
    lines: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
  [key: string]: {
    lines: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
}

/**
 * Get coverage data from a coverage JSON file
 */
export async function getCoverageData(): Promise<CoverageReport | null> {
  try {
    // Try to read the coverage summary JSON file
    const coverageJson = await fs.readFile('coverage/coverage-summary.json', 'utf-8');
    const coverageData = JSON.parse(coverageJson) as CoverageData;
    
    // Extract the total coverage
    const totalCoverage: TestCoverage = {
      lines: {
        total: coverageData.total.lines.total,
        covered: coverageData.total.lines.covered,
        percentage: coverageData.total.lines.pct,
      },
      functions: {
        total: coverageData.total.functions.total,
        covered: coverageData.total.functions.covered,
        percentage: coverageData.total.functions.pct,
      },
      statements: {
        total: coverageData.total.statements.total,
        covered: coverageData.total.statements.covered,
        percentage: coverageData.total.statements.pct,
      },
      branches: {
        total: coverageData.total.branches.total,
        covered: coverageData.total.branches.covered,
        percentage: coverageData.total.branches.pct,
      },
    };
    
    // Extract file-specific coverage
    const fileCoverage: FileCoverageReport[] = [];
    
    for (const [filePath, data] of Object.entries(coverageData)) {
      // Skip the total coverage
      if (filePath === 'total') continue;
      
      // Add file coverage data
      fileCoverage.push({
        path: filePath,
        lines: {
          total: data.lines.total,
          covered: data.lines.covered,
          percentage: data.lines.pct,
          uncoveredLines: [], // Would need to parse the detailed report to get this
        },
        functions: {
          total: data.functions.total,
          covered: data.functions.covered,
          percentage: data.functions.pct,
          uncoveredFunctions: [], // Would need to parse the detailed report to get this
        },
        statements: {
          total: data.statements.total,
          covered: data.statements.covered,
          percentage: data.statements.pct,
        },
        branches: {
          total: data.branches.total,
          covered: data.branches.covered,
          percentage: data.branches.pct,
        },
      });
    }
    
    // Create the full report
    return {
      timestamp: new Date().toISOString(),
      summary: totalCoverage,
      files: fileCoverage,
    };
  } catch (error) {
    console.error('Error reading coverage data:', serializeError(error));
    return null;
  }
}

/**
 * Get detailed coverage for a specific file
 */
export async function getFileCoverage(filePath: string): Promise<FileCoverageReport | null> {
  try {
    const coverageReport = await getCoverageData();
    if (!coverageReport) return null;
    
    // Find the file in the coverage report
    const normalizedPath = path.normalize(filePath);
    const fileCoverage = coverageReport.files.find(file => 
      path.normalize(file.path) === normalizedPath
    );
    
    return fileCoverage || null;
  } catch (error) {
    console.error(`Error getting coverage for ${filePath}:`, serializeError(error));
    return null;
  }
}

/**
 * Save coverage report to a JSON file
 */
export async function saveCoverageReport(outputPath: string): Promise<boolean> {
  try {
    const coverageReport = await getCoverageData();
    if (!coverageReport) return false;
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the report to file
    await fs.writeFile(outputPath, JSON.stringify(coverageReport, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error saving coverage report to ${outputPath}:`, serializeError(error));
    return false;
  }
}

/**
 * Check if coverage meets thresholds
 */
export function checkCoverageThresholds(
  coverage: TestCoverage,
  thresholds: {
    lines?: number;
    functions?: number;
    statements?: number;
    branches?: number;
  }
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  
  if (thresholds.lines !== undefined && coverage.lines.percentage < thresholds.lines) {
    failures.push(`Line coverage ${coverage.lines.percentage}% is below threshold ${thresholds.lines}%`);
  }
  
  if (thresholds.functions !== undefined && coverage.functions.percentage < thresholds.functions) {
    failures.push(`Function coverage ${coverage.functions.percentage}% is below threshold ${thresholds.functions}%`);
  }
  
  if (thresholds.statements !== undefined && coverage.statements.percentage < thresholds.statements) {
    failures.push(`Statement coverage ${coverage.statements.percentage}% is below threshold ${thresholds.statements}%`);
  }
  
  if (thresholds.branches !== undefined && coverage.branches.percentage < thresholds.branches) {
    failures.push(`Branch coverage ${coverage.branches.percentage}% is below threshold ${thresholds.branches}%`);
  }
  
  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Generate a human-readable coverage report
 */
export function formatCoverageReport(report: CoverageReport): string {
  let output = `Coverage Report (${report.timestamp})\n\n`;
  
  // Add summary
  output += 'Summary:\n';
  output += `  Lines: ${report.summary.lines.covered}/${report.summary.lines.total} (${report.summary.lines.percentage}%)\n`;
  output += `  Functions: ${report.summary.functions.covered}/${report.summary.functions.total} (${report.summary.functions.percentage}%)\n`;
  output += `  Statements: ${report.summary.statements.covered}/${report.summary.statements.total} (${report.summary.statements.percentage}%)\n`;
  output += `  Branches: ${report.summary.branches.covered}/${report.summary.branches.total} (${report.summary.branches.percentage}%)\n\n`;
  
  // Add file details
  output += 'Files:\n';
  for (const file of report.files) {
    output += `  ${file.path}\n`;
    output += `    Lines: ${file.lines.covered}/${file.lines.total} (${file.lines.percentage}%)\n`;
    output += `    Functions: ${file.functions.covered}/${file.functions.total} (${file.functions.percentage}%)\n`;
    output += `    Statements: ${file.statements.covered}/${file.statements.total} (${file.statements.percentage}%)\n`;
    output += `    Branches: ${file.branches.covered}/${file.branches.total} (${file.branches.percentage}%)\n\n`;
  }
  
  return output;
}