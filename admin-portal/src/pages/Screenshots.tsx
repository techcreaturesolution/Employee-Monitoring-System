import React, { useEffect, useState } from 'react';
import { screenshotAPI } from '../services/api';
import { Screenshot, Pagination } from '../types';
import { Camera, X, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Screenshots: React.FC = () => {
  const { user } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [filterTag, setFilterTag] = useState('');

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';

  const fetchScreenshots = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterTag) params.productivityTag = filterTag;
      const res = await screenshotAPI.list(params);
      setScreenshots(res.data.data.screenshots);
      setPagination(res.data.data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [filterTag]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this screenshot?')) return;
    try {
      await screenshotAPI.delete(id);
      toast.success('Screenshot deleted');
      fetchScreenshots(pagination.page);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const tagColors: Record<string, string> = {
    productive: 'bg-green-100 text-green-700',
    neutral: 'bg-yellow-100 text-yellow-700',
    unproductive: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="w-6 h-6 text-purple-500" /> Screenshots
        </h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All</option>
            <option value="productive">Productive</option>
            <option value="neutral">Neutral</option>
            <option value="unproductive">Unproductive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : screenshots.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No screenshots yet. They'll appear here when the desktop agent captures them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {screenshots.map((ss) => (
            <div
              key={ss._id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="relative cursor-pointer" onClick={() => setSelectedImage(ss)}>
                <img
                  src={ss.imageUrl}
                  alt={ss.windowTitle || 'Screenshot'}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tagColors[ss.productivityTag] || tagColors.neutral}`}>
                    {ss.productivityTag}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{ss.activeApp || 'Unknown App'}</p>
                <p className="text-xs text-slate-500 truncate">{ss.windowTitle || '-'}</p>
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      {typeof ss.userId === 'object' ? (ss.userId as unknown as { name: string }).name : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(ss.timestamp).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(ss._id)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => fetchScreenshots(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded border hover:bg-white disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchScreenshots(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="p-2 rounded border hover:bg-white disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300">
              <X className="w-6 h-6" />
            </button>
            <img src={selectedImage.imageUrl} alt={selectedImage.windowTitle} className="w-full rounded-lg" />
            <div className="bg-white p-4 rounded-b-lg">
              <p className="font-medium">{selectedImage.activeApp || 'Unknown App'}</p>
              <p className="text-sm text-slate-500">{selectedImage.windowTitle}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(selectedImage.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Screenshots;
