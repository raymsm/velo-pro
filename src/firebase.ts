/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without specifying the database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
