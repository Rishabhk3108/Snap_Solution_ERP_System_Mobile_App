import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [projectId, setProjectIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const [token, rawUser, rawProject] = await Promise.all([
        AsyncStorage.getItem('@token'),
        AsyncStorage.getItem('@user'),
        AsyncStorage.getItem('@projectId'),
      ]);
      if (token && rawUser) {
        setUser(JSON.parse(rawUser));
        if (rawProject) setProjectIdState(parseInt(rawProject, 10));
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (token, userData) => {
    const pairs = [
      ['@token', token],
      ['@user', JSON.stringify(userData)],
    ];
    if (userData.projectId) {
      pairs.push(['@projectId', String(userData.projectId)]);
    }
    await AsyncStorage.multiSet(pairs);
    setUser(userData);
    if (userData.projectId) setProjectIdState(userData.projectId);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['@token', '@user', '@projectId']);
    setUser(null);
    setProjectIdState(null);
  };

  const saveProjectId = async (id) => {
    await AsyncStorage.setItem('@projectId', String(id));
    setProjectIdState(id);
  };

  const completeOnboarding = async () => {
    if (!user) return;
    const updated = { ...user, onboarding_complete: true };
    await AsyncStorage.setItem('@user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, projectId, loading, signIn, signOut, saveProjectId, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
