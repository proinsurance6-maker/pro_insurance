'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { policyAPI } from '@/lib/api';
import { Upload, Download, AlertCircle } from 'lucide-react';

export default function BulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a CSV file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await policyAPI.bulkUpload(formData);
      setResult(res.data);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `policy_number,company_code,broker_code,customer_name,customer_email,customer_phone,policy_type,premium_amount,sum_assured,start_date,end_date
POL001,HDFC,BRK001,John Doe,john@example.com,9876543210,health,50000,500000,2024-01-01,2025-01-01
POL002,ICICI,BRK002,Jane Smith,jane@example.com,9876543211,life,100000,1000000,2024-02-01,2025-02-01`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policy_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Policies</h1>
          <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Follow these steps to bulk upload policies:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Download the CSV template using the button below</li>
                <li>Fill in the policy details in the template</li>
                <li>Make sure company_code and broker_code exist in the system</li>
                <li>Use date format: YYYY-MM-DD</li>
                <li>Upload the completed CSV file</li>
              </ol>
              <div className="pt-4">
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {file ? file.name : 'Click to select CSV file'}
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">CSV file up to 10MB</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Policies'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.data?.successful || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {result.data?.failed || 0}
                    </p>
                  </div>
                </div>

                {result.data?.errors && result.data.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                    <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {result.data.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-800 mb-2">
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 mt-4">
                  {result.message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
