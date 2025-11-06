// src/components/modals/ContentWarningModal.jsx
import React, { useState } from 'react';
import { X, AlertCircle, AlertTriangle, XCircle, Info, BookOpen, Clock } from 'lucide-react';

const ContentWarningModal = ({ isOpen, onClose, warning, onAction }) => {
  const [showGuidelines, setShowGuidelines] = useState(false);

  if (!isOpen || !warning) return null;

  const getSeverityStyles = (severity) => {
    switch(severity) {
      case 'info':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'critical':
        return 'border-red-600 bg-red-500/10';
      default:
        return 'border-neutral-800 bg-neutral-900';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'critical':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Info className="w-6 h-6 text-neutral-500" />;
    }
  };

  const handleButtonAction = (action) => {
    switch(action) {
      case 'acknowledge':
        onClose();
        break;
      case 'learn_more':
      case 'show_guidelines':
        setShowGuidelines(true);
        break;
      case 'support':
        window.open('/support', '_blank');
        break;
      case 'set_reminder':
        // Set a browser notification for 24 hours
        if ('Notification' in window) {
          Notification.requestPermission();
          setTimeout(() => {
            new Notification('Restriction Lifted!', {
              body: 'You can now create and purchase assets again.',
              icon: '/logo.png'
            });
          }, 24 * 60 * 60 * 1000);
        }
        onClose();
        break;
      default:
        onAction(action);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`
        max-w-md w-full bg-black border-2 rounded-lg p-6 relative
        ${getSeverityStyles(warning.severity)}
      `}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          {getSeverityIcon(warning.severity)}
          <h3 className="text-xl font-normal text-white">{warning.title}</h3>
        </div>

        <div className="space-y-4">
          <p className="text-neutral-300">{warning.message}</p>
          
          {warning.guidance && (
            <div className="p-3 bg-black/50 rounded border border-neutral-800">
              <p className="text-sm text-neutral-400">{warning.guidance}</p>
            </div>
          )}

          {warning.suggestion?.show && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
              <p className="text-xs text-purple-400 mb-1">{warning.suggestion.text}</p>
              <p className="text-sm text-white font-mono">{warning.suggestion.example}</p>
            </div>
          )}

          {warning.details && (
            <div className="space-y-2">
              {warning.details.map((detail, idx) => (
                <p key={idx} className="text-sm text-neutral-400">{detail}</p>
              ))}
            </div>
          )}

          {warning.warningNote && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
              <p className="text-sm text-red-400">{warning.warningNote}</p>
            </div>
          )}

          {showGuidelines && (
            <div className="mt-4 p-4 bg-black border border-neutral-800 rounded">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Content Guidelines
              </h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>• Use professional, investor-friendly language</li>
                <li>• Be accurate and honest in descriptions</li>
                <li>• Avoid slang, profanity, or inappropriate content</li>
                <li>• Present your asset as a serious investment</li>
                <li>• Include relevant details investors need</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {warning.buttons?.map((button, idx) => (
              <button
                key={idx}
                onClick={() => handleButtonAction(button.action)}
                className={`
                  flex-1 px-4 py-2 rounded font-normal transition-colors
                  ${button.style === 'primary' 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'}
                `}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentWarningModal;