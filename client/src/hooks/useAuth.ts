import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('[FRONTEND-DEBUG] Login attempt:', credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      console.log('[FRONTEND-DEBUG] Login response:', userData);
      return userData;
    },
    onSuccess: (user) => {
      console.log('[FRONTEND-DEBUG] Login success, setting user data:', user);
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (error) => {
      console.log('[FRONTEND-DEBUG] Login error:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string; email?: string; firstName?: string; lastName?: string }) => {
      console.log('[FRONTEND-DEBUG] Register attempt:', userData.username);
      const res = await apiRequest("POST", "/api/register", userData);
      const newUser = await res.json();
      console.log('[FRONTEND-DEBUG] Register response:', newUser);
      return newUser;
    },
    onSuccess: (user) => {
      console.log('[FRONTEND-DEBUG] Registration success, setting user data:', user);
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (error) => {
      console.log('[FRONTEND-DEBUG] Registration error:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  // If there's an error, consider user as not authenticated and stop loading
  const isAuthenticated = !!user;
  const isActuallyLoading = isLoading && !error;

  return {
    user,
    isLoading: isActuallyLoading,
    isAuthenticated,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}