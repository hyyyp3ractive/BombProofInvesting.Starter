import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, type User, type AuthResponse } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to get current user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Register mutation
  const registerMutation = useMutation<AuthResponse, Error, { email: string; password: string }>({
    mutationFn: ({ email, password }) => authService.register(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "user"], data.user);
      toast({
        title: "Account created",
        description: "Welcome to Crypto Evaluator!",
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation<AuthResponse, Error, { email: string; password: string }>({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "user"], data.user);
      toast({
        title: "Welcome back",
        description: "Successfully logged in!",
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, Error>({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear(); // Clear all cached data
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    },
    onError: (error) => {
      // Still clear the user data even if logout request fails
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "Session ended",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation<User, Error, any>({
    mutationFn: (settingsJson) => authService.updateUserSettings(settingsJson),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["auth", "user"], updatedUser);
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // State
    user,
    isLoading,
    isAuthenticated: !!user,
    error,

    // Actions
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    updateSettings: updateSettingsMutation.mutate,

    // Loading states
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
