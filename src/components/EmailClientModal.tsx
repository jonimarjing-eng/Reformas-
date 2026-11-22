import React, { useEffect, useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import { ORDER_STATUS_MAP } from '../data/reformsCatalog';
import {
  getCachedGmailAccessToken,
  googleSignInWithGmail,
} from '../lib/firebase';
import {
  buildStatusEmailDraft,
  GmailAuthError,
  isValidEmailAddress,
  sendGmailMessage,
} from '../services/gmailService';
import type { Order } from '../types/order';

interface EmailClientModalProps {
  order: Order | null;
  senderEmail: string | null;
  onClose: () => void;
  onSent: (recipientEmail: string, plate: string) => void;
}

export function EmailClientModal({
  order,
  senderEmail,
  onClose,
  onSent,
}: EmailClientModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    const draft = buildStatusEmailDraft(order);
    setTo(draft.to);
    setSubject(draft.subject);
    setBody(draft.body);
    setHasToken(Boolean(getCachedGmailAccessToken()));
    setErrorMessage(null);
    setSending(false);
    setConnecting(false);
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending && !connecting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [order, sending, connecting, onClose]);

  if (!order) return null;

  const statusMeta = ORDER_STATUS_MAP[order.status];

  const handleConnectGmail = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      const result = await googleSignInWithGmail();
      if (result.accessToken) {
        setHasToken(true);
      } else {
        setErrorMessage(
          'No se obtuvo permiso para enviar correos desde Gmail. Inténtalo de nuevo y acepta el acceso.'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage('Has cerrado la ventana de Google antes de completar la conexión.');
      } else {
        setErrorMessage('No se pudo conectar con Gmail. Inténtalo de nuevo.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidEmailAddress(to)) {
      setErrorMessage(
        'Introduce una dirección de correo válida del cliente (ej. cliente@ejemplo.es).'
      );
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setErrorMessage('El asunto y el mensaje son obligatorios.');
      return;
    }

    const token = getCachedGmailAccessToken();
    if (!token) {
      setHasToken(false);
      setErrorMessage(
        'Conecta primero tu cuenta de Google para autorizar el envío desde Gmail.'
      );
      return;
    }

    setSending(true);
    try {
      await sendGmailMessage({
        accessToken: token,
        to,
        subject,
        body,
      });
      onSent(to.trim(), order.licensePlate);
      onClose();
    } catch (err) {
      if (err instanceof GmailAuthError) {
        setHasToken(false);
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'No se pudo enviar el correo. Inténtalo de nuevo.'
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-client-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!sending && !connecting) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2
              id="email-client-title"
              className="font-display text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <Mail className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <span>Enviar actualización por correo</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="font-mono font-medium text-slate-700 tabular-nums">
                {order.licensePlate}
              </span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>{order.clientName}</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span className={`font-medium ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending || connecting}
            aria-label="Cerrar diálogo de correo"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleConfirmSend}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          noValidate
        >
          {/* Explicit confirmation description */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 leading-relaxed">
            Revisa el destinatario y el contenido antes de confirmar. Al pulsar{' '}
            <span className="font-semibold text-slate-900">
              Confirmar y enviar correo
            </span>
            , se enviará este mensaje desde tu cuenta de Gmail
            {senderEmail ? ` (${senderEmail})` : ''}.
          </div>

          {!hasToken && (
            <div className="p-4 bg-white border border-slate-300 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Conecta tu cuenta de Gmail para enviar
                </p>
                <p className="mt-0.5 text-slate-600">
                  Necesitas confirmar tu sesión de Google en esta pestaña antes de enviar el correo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={connecting}
                className="h-10 px-4 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-800 inline-flex items-center justify-center gap-2.5 shadow-xs transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>
                  {connecting ? 'Conectando...' : 'Conectar con Google'}
                </span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="email-recipient"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Para (correo del cliente) *
            </label>
            <input
              id="email-recipient"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@ejemplo.es"
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label
              htmlFor="email-subject"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Asunto *
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label
              htmlFor="email-body"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Mensaje *
            </label>
            <textarea
              id="email-body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending || connecting}
              className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending || connecting || !hasToken}
              className="h-10 px-5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>
                {sending ? 'Enviando correo...' : 'Confirmar y enviar correo'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
