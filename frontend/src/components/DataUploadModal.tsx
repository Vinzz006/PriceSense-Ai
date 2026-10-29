import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { UploadResponse } from '../types';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (res: UploadResponse) => void;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setUploadResult(null);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        setFile(droppedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please select a valid CSV file (.csv).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.csv')) {
        setFile(selected);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please select a valid CSV file (.csv).');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await api.uploadCsv(file);
      setUploadResult(res);
      onUploadSuccess(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process CSV file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Mandi CSV Dataset</h3>
              <p className="text-xs text-slate-500">
                Upload custom agricultural market prices (Agmarknet or standard CSV format)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Expected format guidelines */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-800">Supported Columns & Formats:</div>
            <p className="text-slate-600">
              Columns recognized automatically: <code className="bg-white px-1.5 py-0.5 rounded border">date</code> or <code className="bg-white px-1.5 py-0.5 rounded border">Arrival_Date</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border">state</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border">market</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border">commodity</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border">modal_price</code> or <code className="bg-white px-1.5 py-0.5 rounded border">Modal_x0020_Price</code>.
            </p>
            <p className="text-slate-500 text-[11px]">
              Optional columns: <code className="bg-white px-1 py-0.5 rounded border">district</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border">variety</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border">grade</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border">min_price</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border">max_price</code>.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {file ? file.name : 'Click to select or drag and drop a CSV file'}
              </p>
              <p className="text-xs text-slate-500">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to process`
                  : 'CSV up to 50 MB (UTF-8 encoded)'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Success Report & Preview */}
          {uploadResult && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dataset Ingested Successfully!
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                  <div className="bg-white/80 p-2 rounded">
                    <span className="text-[10px] uppercase text-slate-500 block">Accepted Rows</span>
                    <span className="font-bold text-slate-900">
                      {uploadResult.rows_accepted.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded">
                    <span className="text-[10px] uppercase text-slate-500 block">Unique Dates</span>
                    <span className="font-bold text-slate-900">{uploadResult.unique_dates}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded">
                    <span className="text-[10px] uppercase text-slate-500 block">Markets</span>
                    <span className="font-bold text-slate-900">{uploadResult.markets_count}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded">
                    <span className="text-[10px] uppercase text-slate-500 block">Commodities</span>
                    <span className="font-bold text-slate-900">{uploadResult.commodities_count}</span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Date range: {uploadResult.start_date || 'N/A'} to {uploadResult.end_date || 'N/A'}
                </div>
              </div>

              {/* Data Preview */}
              {uploadResult.preview && uploadResult.preview.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Ingestion Preview (First 5 Rows):</span>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto text-[11px]">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">State</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Market</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Commodity</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-600">Modal (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {uploadResult.preview.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{row.date}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{row.state}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{row.market}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{row.commodity}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-right font-mono text-emerald-700 font-medium">
                              ₹{row.modal_price}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-all shadow-xs"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Upload & Inspect'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
