import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, Clock, CheckCircle, AlertCircle, TrendingUp, Filter } from "lucide-react";
import type { Lead, CallLog } from "@shared/schema";
// Token response type
type TokenResponse = { balance: number };

export default function Leads() {
  const { user, isLoading: authLoading } = useAuth();

  // Fetch user's leads and call logs only when user is authenticated
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const { data: callLogs = [] } = useQuery<CallLog[]>({
    queryKey: ["/api/call-logs"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Fetch user's token balance only when user is authenticated
  const { data: userTokens } = useQuery<TokenResponse>({
    queryKey: ["/api/user/tokens"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex h-screen bg-space space-pattern circuit-pattern items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const tokenBalance = userTokens?.balance || 0;

  // Calculate real stats from user's data
  const totalCalls = callLogs.length;
  const completedCalls = callLogs.filter(call => call.status === 'completed').length;
  const avgDuration = callLogs.length > 0 
    ? Math.round(callLogs.reduce((sum, call) => sum + (call.duration || 0), 0) / callLogs.length)
    : 0;
  const hotLeads = leads.filter(lead => lead.status === 'hot').length;

  const stats = [
    { title: "Total Calls", value: totalCalls.toString(), change: "+0%", icon: Phone },
    { title: "Completed Calls", value: completedCalls.toString(), change: "+0%", icon: TrendingUp },
    { title: "Avg Duration", value: `${Math.floor(avgDuration / 60)}:${(avgDuration % 60).toString().padStart(2, '0')}`, change: "+0%", icon: Clock },
    { title: "Hot Leads", value: hotLeads.toString(), change: "+0", icon: CheckCircle }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "Interested": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Not Interested": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Call Back": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Voicemail": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar activeSection="leads" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="leads" 
          subscriptionData={undefined}
          user={user as import("@shared/schema").User}
        />
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-2"
            >
              <h1 className="text-2xl font-orbitron font-bold">
                <GradientText>Results & Analysis</GradientText>
              </h1>
              <p className="text-muted-foreground">
                Overview of past calls, performance insights, and actionable to-dos
              </p>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-green-500">{stat.change}</p>
                        </div>
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  All Results
                </Button>
                <Button variant="ghost" size="sm">Interested</Button>
                <Button variant="ghost" size="sm">Follow-up Required</Button>
                <Button variant="ghost" size="sm">High Priority</Button>
              </div>
            </motion.div>

            {/* Results Table */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="font-orbitron">Recent Call Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {callLogs.length === 0 ? (
                      <div className="text-center py-8">
                        <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No calls yet</h3>
                        <p className="text-muted-foreground">
                          Your call history will appear here once you start making calls.
                        </p>
                      </div>
                    ) : (
                      callLogs.map((call, index) => (
                      <motion.div
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                            <Phone className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{call.phoneNumber}</div>
                            <div className="text-sm text-muted-foreground">Call #{call.id}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge className={call.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                            {call.status || 'Unknown'}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {call.createdAt ? new Date(call.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
