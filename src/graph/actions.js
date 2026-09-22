import { createContext, useContext } from 'react';

// Stable callbacks shared with the node components, so node data stays plain and cheap.
export const MapActions = createContext(null);
export const useMapActions = () => useContext(MapActions);
