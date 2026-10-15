import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';

import { api } from '../services/api';

interface CsvImporterProps {
  onSuccess: () => void;
  existingMemberNumbers: string[];
}

interface ParsedRow {
  member_number: string;
  full_name: string;
  phone?: string;
  remaining_meals: number;
  isValid: boolean;
  error?: string;
}

export const CsvImporter: React.FC<CsvImporterProps> = ({ onSuccess, existingMemberNumbers }) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Parse CSV text into validated row objects
  const parseCsvContent = (content: string) => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Find column indexes with flexible naming
    const numIdx = headers.findIndex(h => h.includes('number') || h.includes('id') || h.includes('code') || h === 'no');
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
    const mealsIdx = headers.findIndex(h => h.includes('meal') || h.includes('balance') || h.includes('remaining'));

    const rows: ParsedRow[] = [];
    const seenNumbers = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      const memberNumber = (numIdx >= 0 && cols[numIdx]) ? cols[numIdx] : (cols[0] || '');
      const fullName = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx] : (cols[1] || '');
      const phone = (phoneIdx >= 0 && cols[phoneIdx]) ? cols[phoneIdx] : (cols[2] || undefined);
      const mealsStr = (mealsIdx >= 0 && cols[mealsIdx]) ? cols[mealsIdx] : (cols[3] || '54');
      const meals = parseInt(mealsStr, 10);

      let isValid = true;
      let error = '';

      if (!memberNumber) {
        isValid = false;
        error = 'Missing Member #';
      } else if (!fullName) {
        isValid = false;
        error = 'Missing Full Name';
      } else if (seenNumbers.has(memberNumber.toLowerCase())) {
        isValid = false;
        error = 'Duplicate in this CSV';
      } else if (existingMemberNumbers.includes(memberNumber.toLowerCase())) {
        isValid = false;
        error = 'Already registered';
      }

      if (isValid) {
        seenNumbers.add(memberNumber.toLowerCase());
      }

      rows.push({
        member_number: memberNumber,
        full_name: fullName,
        phone,
        remaining_meals: isNaN(meals) ? 54 : meals,
        isValid,
        error
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsvContent(text);
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    const sample = `member_number,full_name,phone,remaining_meals\nM-201,Rajesh Patel,9823456789,54\nM-202,Priya Nair,9871234567,48\nM-203,Karan Johar,9988776655,50\nM-204,Deepika Iyer,9811223344,42\nM-205,Vikram Seth,9765432100,54`;
    setCsvText(sample);
    parseCsvContent(sample);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await api.batchImportMembers(
        validRows.map(r => ({
          member_number: r.member_number,
          full_name: r.full_name,
          phone: r.phone,
          remaining_meals: r.remaining_meals
        }))
      );

      setImportResult(result);
      if (result.success > 0) {
        onSuccess();
      }
    } catch (err) {
      setImportResult({
        success: 0,
        failed: validRows.length,
        errors: ['Import service exception: Database error occurred.']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upload & Drop Zone */}
      <div className="card">
        <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Legacy Member Migration</span>
        <h2 style={{ fontSize: '24px', marginTop: '4px' }}>Import Existing 400+ Members</h2>
        <p style={{ color: 'var(--color-ash)', fontSize: '14px', marginTop: '6px' }}>
          Upload your existing paper-register spreadsheet. Preserves your original member numbers (e.g. <code>M-101</code>, <code>405</code>), sets initial meal counts, and generates secure digital passes.
        </p>

        <div style={{
          border: '2px dashed var(--color-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-canvas)',
          margin: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FileSpreadsheet size={48} color="var(--color-stone)" />
          <div>
            <h4 style={{ fontSize: '17px', fontWeight: 600 }}>Choose CSV file from your computer</h4>
            <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px' }}>
              Standard CSV with columns: <code>member_number, full_name, phone, remaining_meals</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <label className="btn btn-primary btn-pill" style={{ cursor: 'pointer' }}>
              <Upload size={16} /> Select CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={loadSampleData}
              className="btn btn-secondary btn-pill"
            >
              Load Sample 5 Members Template
            </button>
          </div>
        </div>

        {/* Or Paste Raw Text */}
        <details style={{ marginTop: '8px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--color-stone)', fontWeight: 600 }}>
            Or paste raw CSV text directly...
          </summary>
          <div style={{ marginTop: '12px' }}>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                parseCsvContent(e.target.value);
              }}
              placeholder="member_number,full_name,phone,remaining_meals&#10;M-201,Rajesh Patel,9823456789,54"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            />
          </div>
        </details>
      </div>

      {/* Import Result Notification */}
      {importResult && (
        <div className="card" style={{
          backgroundColor: importResult.success > 0 ? '#e9f5ec' : '#fdf2f0',
          border: `1px solid ${importResult.success > 0 ? '#c2e2c8' : '#f1cfc4'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {importResult.success > 0 ? (
              <CheckCircle size={24} color="var(--color-forest)" />
            ) : (
              <AlertTriangle size={24} color="var(--color-error)" />
            )}
            <div>
              <h4 style={{ fontWeight: 600, color: importResult.success > 0 ? 'var(--color-forest)' : 'var(--color-error)' }}>
                Import Completed: {importResult.success} successfully added ({importResult.failed} failed)
              </h4>
              {importResult.errors.length > 0 && (
                <ul style={{ fontSize: '12px', color: 'var(--color-ink)', marginTop: '6px', paddingLeft: '18px' }}>
                  {importResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Table & Confirmation */}
      {parsedRows.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '20px' }}>CSV Data Preview ({parsedRows.length} Rows)</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '2px' }}>
                <strong style={{ color: 'var(--color-forest)' }}>{validCount} ready to import</strong>
                {invalidCount > 0 && (
                  <span style={{ color: 'var(--color-error)', marginLeft: '12px' }}>
                    • {invalidCount} rows require attention
                  </span>
                )}
              </p>
            </div>

            <button
              disabled={isImporting || validCount === 0}
              onClick={handleExecuteImport}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Importing {validCount} Members...
                </>
              ) : (
                <>
                  <Play size={16} /> Confirm & Import {validCount} Members
                </>
              )}
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)', textAlign: 'left', color: 'var(--color-stone)' }}>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Member #</th>
                  <th style={{ padding: '8px 12px' }}>Full Name</th>
                  <th style={{ padding: '8px 12px' }}>Phone</th>
                  <th style={{ padding: '8px 12px' }}>Initial Balance</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--color-hairline)',
                      backgroundColor: r.isValid ? 'transparent' : 'rgba(227, 58, 34, 0.05)'
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      {r.isValid ? (
                        <span className="badge badge-active" style={{ fontSize: '10px' }}>Valid</span>
                      ) : (
                        <span className="badge badge-error" style={{ fontSize: '10px' }}>{r.error}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {r.member_number}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{r.full_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-ash)' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.remaining_meals} meals</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
