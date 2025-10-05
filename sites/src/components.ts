/**
 * React components for MDX rendering
 */

import { createElement as h } from 'react'

export const Button = ({ children, variant = 'primary' }: { children: React.ReactNode; variant?: string }) =>
  h(
    'button',
    {
      className: `btn btn-${variant}`,
      style: {
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        border: 'none',
        backgroundColor: variant === 'primary' ? '#3b82f6' : '#6b7280',
        color: 'white',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    },
    children
  )

export const Card = ({ title, children }: { title?: string; children: React.ReactNode }) =>
  h(
    'div',
    {
      className: 'card',
      style: {
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    },
    title &&
      h(
        'h3',
        {
          style: {
            marginTop: 0,
            marginBottom: '1rem',
            fontSize: '1.25rem',
            fontWeight: '600',
          },
        },
        title
      ),
    h('div', null, children)
  )

export const Alert = ({ type = 'info', children }: { type?: 'info' | 'warning' | 'error' | 'success'; children: React.ReactNode }) => {
  const colors = {
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  }
  const style = colors[type]

  return h(
    'div',
    {
      className: `alert alert-${type}`,
      style: {
        padding: '1rem',
        borderRadius: '0.5rem',
        border: `2px solid ${style.border}`,
        backgroundColor: style.bg,
        color: style.text,
        marginBottom: '1rem',
      },
    },
    children
  )
}

export const CodeBlock = ({ children, language = 'typescript' }: { children: React.ReactNode; language?: string }) =>
  h(
    'div',
    {
      className: 'code-block',
      style: {
        marginBottom: '1rem',
      },
    },
    h(
      'div',
      {
        style: {
          backgroundColor: '#1f2937',
          color: '#9ca3af',
          padding: '0.5rem 1rem',
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
        },
      },
      language
    ),
    h(
      'pre',
      {
        style: {
          backgroundColor: '#111827',
          color: '#e5e7eb',
          padding: '1rem',
          borderBottomLeftRadius: '0.5rem',
          borderBottomRightRadius: '0.5rem',
          overflow: 'auto',
          margin: 0,
        },
      },
      h('code', null, children)
    )
  )
