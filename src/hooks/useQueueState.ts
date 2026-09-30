import { useState, useEffect, useCallback } from 'react';
import { queueEngine } from '../services/queueEngine';
import { QueueToken, Restaurant, QueueMetrics } from '../types';

export function useQueueState(selectedRestaurantId?: string) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    // Re-render immediately whenever queue engine dispatches an update
    const unsubscribe = queueEngine.subscribe(() => {
      setRevision((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const restaurants = queueEngine.getRestaurants();
  const allTokens = queueEngine.getAllTokens();
  const userToken = queueEngine.getUserToken();

  const userPosition = userToken ? queueEngine.getUserTokenQueuePosition(userToken.id) : -1;
  const userRestaurant = userToken ? queueEngine.getRestaurant(userToken.restaurantId) : undefined;

  const currentRestId = selectedRestaurantId || (restaurants.length > 0 ? restaurants[0].id : '');
  const activeQueue = queueEngine.getActiveQueue(currentRestId);
  const currentlyServing = queueEngine.getCurrentlyServing(currentRestId);
  const metrics = queueEngine.getMetrics(currentRestId);

  // Actions
  const claimToken = useCallback((restaurantId: string, partySize: number, name?: string, phone?: string) => {
    return queueEngine.claimToken(restaurantId, partySize, name, phone);
  }, []);

  const serveNext = useCallback((restaurantId: string, counterName?: string) => {
    return queueEngine.serveNext(restaurantId, counterName);
  }, []);

  const skipToken = useCallback((tokenId: string, reason?: string) => {
    return queueEngine.skipToken(tokenId, reason);
  }, []);

  const completeService = useCallback((tokenId: string) => {
    return queueEngine.completeService(tokenId);
  }, []);

  const recallToken = useCallback((tokenId: string, counterName?: string) => {
    return queueEngine.recallToken(tokenId, counterName);
  }, []);

  const cancelToken = useCallback((tokenId: string) => {
    queueEngine.cancelToken(tokenId);
  }, []);

  const rejoinQueue = useCallback((tokenId: string) => {
    queueEngine.rejoinQueue(tokenId);
  }, []);

  const addWalkIn = useCallback((restaurantId: string, partySize: number, name?: string, notes?: string) => {
    return queueEngine.addWalkIn(restaurantId, partySize, name, notes);
  }, []);

  const resetQueue = useCallback((restaurantId: string) => {
    queueEngine.resetQueue(restaurantId);
  }, []);

  const counterTimeoutSeconds = queueEngine.getCounterTimeoutSeconds();
  const setCounterTimeoutSeconds = useCallback((sec: number) => {
    queueEngine.setCounterTimeoutSeconds(sec);
  }, []);

  const latestExpiredNotification = queueEngine.getLatestExpiredNotification();
  const dismissExpiredNotification = useCallback(() => {
    queueEngine.dismissExpiredNotification();
  }, []);

  return {
    restaurants,
    allTokens,
    userToken,
    userPosition,
    userRestaurant,
    activeQueue,
    currentlyServing,
    metrics,
    counterTimeoutSeconds,
    setCounterTimeoutSeconds,
    latestExpiredNotification,
    dismissExpiredNotification,
    claimToken,
    serveNext,
    skipToken,
    completeService,
    recallToken,
    cancelToken,
    rejoinQueue,
    addWalkIn,
    resetQueue,
  };
}
