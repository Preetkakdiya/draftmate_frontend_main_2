import React from 'react';
import { Link } from 'react-router-dom';

const IntegrationSettings = () => {
  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/library"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Library
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integration Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your e-Courts and third-party integrations
          </p>
        </div>

        {/* API Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">wifi</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Status</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">All services are operational</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <p className="text-sm font-medium text-slate-900 dark:text-white">e-Courts API</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Coming Soon</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Surepass API</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* e-Courts India Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">gavel</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">e-Courts India</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Official e-Courts integration</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              Coming Soon
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Features</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                CNR Search
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Case Status Tracking
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Order and Judgment Download
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Cause List Tracking
              </li>
            </ul>
          </div>
        </div>

        {/* Surepass API Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">link</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Surepass API</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Third-party e-Courts integration</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              Coming Soon
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Features</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Advanced CNR Search
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Bulk Case Tracking
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Push Notifications
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Case History Analytics
              </li>
            </ul>
          </div>
        </div>

        {/* Future Architecture Note */}
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Future-Ready Architecture
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            DraftMate is built with a modular architecture that will support:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-700 dark:text-amber-300">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-sm">arrow_right</span>
              <code className="bg-amber-100 dark:bg-amber-900/20 px-1.5 py-0.5 rounded text-xs">
                https://ecourtsindia.com/api
              </code>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-sm">arrow_right</span>
              <code className="bg-amber-100 dark:bg-amber-900/20 px-1.5 py-0.5 rounded text-xs">
                https://surepass.io/ecourts-api/
              </code>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-sm">arrow_right</span>
              Easy plugin-based integration with other legal databases
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
