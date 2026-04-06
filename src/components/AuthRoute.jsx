"use client";

import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Notify from './Notify.js';
import Loader from './Loader.jsx';
import api from '../lib/api.js';
import { refreshToken as refreshTokenApi } from '../services/auth.service.js';
import { useAuthStore } from '../store/auth.store.js';

function AuthRoute({ children }) {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { accessToken, refreshToken, setAccessToken, signOut, setRedirectPath } = useAuthStore();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const logoutUser = useCallback(() => {
    signOut();

    const currentRoute = window.location.pathname + window.location.search + window.location.hash;
    if (currentRoute !== '/auth') {
      setRedirectPath(currentRoute);
    }

    navigate('/auth');
  }, [navigate, setRedirectPath, signOut]);

  const refreshAccessToken = useCallback(async () => {
    setLoading(true);
    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await refreshTokenApi(refreshToken);

      setAccessToken(data.accessToken);
      setLoading(false);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Token refresh failed', error);
      Notify.error('Session expired. Please log in again.');
      setLoading(false);
      logoutUser();
      return false;
    }
  }, [logoutUser, refreshToken, setAccessToken]);

  const checkAuth = useCallback(async () => {
    if (!hasHydrated) return false;

    setLoading(true);

    if (!accessToken || !refreshToken) {
      setLoading(false);

      const currentRoute = window.location.pathname + window.location.search + window.location.hash;
      if (currentRoute !== '/auth') {
        setRedirectPath(currentRoute);
      }

      navigate('/auth');
      return false;
    }

    try {
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const expTime = tokenPayload.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = 60 * 1000;

      if (currentTime >= expTime) {
        return await refreshAccessToken();
      }
      if (expTime - currentTime <= bufferTime) {
        return await refreshAccessToken();
      }

      setLoading(false);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Invalid token format', error);
      Notify.error('Authentication error, please log in again.');
      setLoading(false);
      logoutUser();
      return false;
    }
  }, [navigate, refreshAccessToken, logoutUser, accessToken, refreshToken, setRedirectPath, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    let authCheckInterval;

    const initialCheck = async () => {
      await checkAuth();

      authCheckInterval = setInterval(() => {
        checkAuth();
      }, 30000);
    };

    initialCheck();

    return () => {
      if (authCheckInterval) clearInterval(authCheckInterval);
    };
  }, [checkAuth, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    const checkOnboarding = async () => {
      try {
        const response = await api.get('/api/onboarding/me');
        const data = response.data;

        const pendingTasks = Array.isArray(data?.pendingTasks) ? data.pendingTasks : [];
        const completedTasks = Array.isArray(data?.completedTasks) ? data.completedTasks : [];
        const criticalPending = pendingTasks.filter((task) => task !== 'CONNECT_PAYOUT');
        const hasCompletedCore = criticalPending.length === 0 && completedTasks.length > 0;

        if (!hasCompletedCore && window.location.pathname !== '/onboarding') {
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Failed to check onboarding status', error);
      }
    };

    checkOnboarding();
  }, [hasHydrated, isAuthenticated, navigate]);

  useEffect(() => {
    if (!hasHydrated) return;

    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const newToken = useAuthStore.getState().accessToken;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken, hasHydrated]);

  if (!hasHydrated) {
    return <Loader />;
  }

  if (loading && !isAuthenticated) {
    return <Loader />;
  }

  return children;
}

export default AuthRoute;
