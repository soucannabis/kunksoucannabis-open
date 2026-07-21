import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { STORAGE_SETUP_GUIDES } from '@kunk/admin-docs';

const CREDENTIAL_GUIDE_BOX_STYLE = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: '0.85rem',
  padding: '0.85rem 1rem',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#f7f7f7',
  color: '#111',
};

const mdComponents = {
  p: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: '#0b57d0' }}>
      {children}
    </a>
  ),
};

export function StorageCredentialsGuide({ provider }) {
  const guide = STORAGE_SETUP_GUIDES[provider];
  if (!guide) return null;
  const { title, steps, docs } = guide;

  return (
    <div
      className="ext-credentials-guide"
      data-testid={`storage-${provider}-setup-guide`}
      style={CREDENTIAL_GUIDE_BOX_STYLE}
    >
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#111' }}>
        {title || 'Como obter as credenciais'}
      </p>
      <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#111' }}>
        {steps.map((step, i) => (
          <li key={i} style={{ marginBottom: i === steps.length - 1 ? 0 : 6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {step}
            </ReactMarkdown>
          </li>
        ))}
      </ol>
      {docs?.length ? (
        <p style={{ margin: '0.75rem 0 0', color: '#444' }}>
          Docs:{' '}
          {docs.map((d, i) => (
            <span key={d.href}>
              {i > 0 ? ' · ' : null}
              <a href={d.href} target="_blank" rel="noreferrer" style={{ color: '#0b57d0' }}>
                {d.label}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export { STORAGE_SETUP_GUIDES };
