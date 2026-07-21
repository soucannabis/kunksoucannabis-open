import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  DOC_SECTIONS,
  articles,
  articlesBySection,
  getArticleBySlug,
  searchArticles,
  docsPathForSlug,
} from '@kunk/admin-docs';

function resolveDocsHref(href) {
  if (!href) return { kind: 'external', href: '#' };
  if (href.startsWith('/inicio/') || href === '/inicio') {
    const slug = href === '/inicio' ? '' : href.slice('/inicio/'.length);
    return { kind: 'docs', slug, to: docsPathForSlug(slug) };
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return { kind: 'admin', to: href };
  }
  return { kind: 'external', href };
}

function DocsMarkdown({ content }) {
  const components = useMemo(
    () => ({
      a({ href, children }) {
        const resolved = resolveDocsHref(href);
        if (resolved.kind === 'docs' || resolved.kind === 'admin') {
          return <Link to={resolved.to}>{children}</Link>;
        }
        return (
          <a href={resolved.href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
    }),
    []
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

export function DocsHomePage() {
  const { slug } = useParams();
  const [query, setQuery] = useState('');
  const article = getArticleBySlug(slug);

  const filtered = useMemo(() => searchArticles(articles, query), [query]);
  const bySection = useMemo(() => {
    const map = articlesBySection();
    if (!query.trim()) return map;
    const next = new Map();
    for (const section of DOC_SECTIONS) {
      next.set(
        section.id,
        (map.get(section.id) || []).filter((a) => filtered.includes(a))
      );
    }
    return next;
  }, [filtered, query]);

  if (!article) {
    return <Navigate to="/inicio" replace />;
  }

  const searching = Boolean(query.trim());

  return (
    <div className="admin-docs" data-testid="admin-docs-home">
      <header className="admin-docs-header">
        <div>
          <h1>Central de ajuda</h1>
          <p className="muted">
            Guia das páginas e configurações do Admin — em linguagem simples, com links para as
            telas.
          </p>
        </div>
        <label className="admin-docs-search">
          <span className="visually-hidden">Pesquisar documentação</span>
          <input
            type="search"
            data-testid="admin-docs-search"
            placeholder="Pesquisar (ex.: frete, logo, triagem…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
      </header>

      <div className="admin-docs-layout">
        <nav className="admin-docs-nav" aria-label="Índice da documentação">
          {DOC_SECTIONS.map((section) => {
            const items = bySection.get(section.id) || [];
            if (searching && items.length === 0) return null;
            return (
              <div key={section.id} className="admin-docs-nav-section">
                <div className="admin-docs-nav-title">{section.title}</div>
                <ul>
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={docsPathForSlug(a.slug)}
                        className={a.id === article.id ? 'active' : undefined}
                        data-testid={`admin-docs-nav-${a.id}`}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {searching && filtered.length === 0 ? (
            <p className="muted admin-docs-empty">Nenhum resultado para “{query.trim()}”.</p>
          ) : null}
        </nav>

        <article className="admin-docs-article" data-testid="admin-docs-article">
          <div className="admin-docs-article-toolbar">
            <h2>{article.title}</h2>
            {article.adminPath && article.adminPath !== '/inicio' ? (
              <Link
                className="btn btn-primary"
                to={article.adminPath}
                data-testid="admin-docs-open-page"
              >
                Abrir no Admin
              </Link>
            ) : null}
          </div>
          <div className="admin-docs-prose">
            <DocsMarkdown content={article.body} />
          </div>
        </article>
      </div>
    </div>
  );
}
