import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/glow-button";
import { GradientText } from "@/components/ui/gradient-text";
import { useToast } from "@/hooks/use-toast";
import { Phone } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const callFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type CallFormData = z.infer<typeof callFormSchema>;

export function CallForm() {
  const { toast } = useToast();
  
  const form = useForm<CallFormData>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      message: "",
    },
  });

  // Real call initiation with backend integration
  const initiateCall = useMutation({
    mutationFn: async (callData: any) => {
      const response = await apiRequest("POST", "/api/calls", callData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call Initiated",
        description: `Call started to ${data.phoneNumber}`,
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CallFormData) => {
    await initiateCall.mutateAsync({
      phoneNumber: data.phoneNumber,
      message: data.message,
      leadName: data.name,
      voiceAgentId: 1, // Default to first voice agent
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <GradientText>Manual Call</GradientText>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+1 (555) 000-0000" 
                      type="tel"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your message"
                      className="resize-none"
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <GlowButton
              type="submit"
              className="w-full"
              disabled={initiateCall.isPending}
            >
              <Phone className="w-4 h-4 mr-2" />
              {initiateCall.isPending ? "Initiating..." : "Call Now"}
            </GlowButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
