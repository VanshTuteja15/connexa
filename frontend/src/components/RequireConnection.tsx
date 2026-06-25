import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useConnections } from '../hooks/useConnections';
import LoadingSpinner from './LoadingSpinner';
import Layout from './Layout';

interface RequireConnectionProps {
  children: ReactNode;
  allowWithout?: boolean;
}

export function RequireConnection({ children, allowWithout = false }: RequireConnectionProps) {
  const { loading, hasConnections } = useConnections();

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-24" />
      </Layout>
    );
  }

  if (!allowWithout && !hasConnections) {
    return <Navigate to="/connect-database" replace />;
  }

  return <Layout>{children}</Layout>;
}

export function useConnectionGuard() {
  const { hasConnections, loading } = useConnections();
  return { hasConnections, loading };
}
