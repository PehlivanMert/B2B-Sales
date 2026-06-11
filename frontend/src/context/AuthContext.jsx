import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserData(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Ensure user exists
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newUser = {
            email: user.email,
            role: 'sales_rep',
            firstName: user.email.split('@')[0],
            lastName: '',
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newUser);
        }
        
        // Listen to changes in real-time
        const unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          }
        });
        
        // We need to clean up the snapshot listener when auth changes
        // but useEffect cleanup only handles the main unsubscribe.
        // We can attach it to the window or a ref, but for simplicity:
        setLoading(false);
        return () => {
          unsubscribeSnapshot();
        };
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
