import Link from "next/link";
import { ArrowRight, Building2, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left Column - Content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              Built for Construction Professionals
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
              Streamline Your{" "}
              <span className="text-blue-600">Construction Projects</span>{" "}
              from Start to Finish
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              The all-in-one platform for construction management. Track projects, 
              manage tasks, control budgets, and collaborate with your team — 
              all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button asChild size="lg" className="text-base px-8 py-6">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="text-base px-8 py-6">
                <Link href="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Cancel anytime
              </div>
            </div>
          </div>
          
          {/* Right Column - Visual/Dashboard Mockup */}
          <div className="relative lg:ml-auto">
            <div className="relative rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Active Projects</div>
                    <div className="text-sm text-gray-500">Dashboard Overview</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Dashboard Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Projects</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">98%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">$2.4M</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Budget Managed</div>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">156</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</div>
                </div>
              </div>
              
              {/* Recent Activity */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-900">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="flex-1 text-xs text-gray-600 dark:text-gray-400">
                        Project milestone completed
                      </div>
                      <div className="text-xs text-gray-400">2h ago</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 dark:bg-blue-900/30 rounded-full blur-3xl opacity-30" />
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl opacity-30" />
          </div>
        </div>
      </div>
    </section>
  );
}
