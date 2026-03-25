import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLANS = [
  {
    name: "Solo",
    price: "$29",
    description: "Perfect for independent contractors and small operations",
    features: [
      "Up to 10 active projects",
      "1 team member",
      "Project management",
      "Task tracking",
      "Purchase orders"
    ]
  },
  {
    name: "Team",
    price: "$79",
    description: "Ideal for growing construction companies",
    features: [
      "Unlimited projects",
      "Up to 5 team members",
      "Everything in Solo",
      "Team collaboration",
      "Client portal access"
    ],
    popular: true
  },
  {
    name: "Growth",
    price: "$149",
    description: "For large-scale operations and enterprises",
    features: [
      "Unlimited projects",
      "Up to 15 team members",
      "Everything in Team",
      "Advanced analytics",
      "API access"
    ]
  }
];

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that fits your construction business. All plans include a 14-day free trial.
          </p>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {PLANS.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-blue-600 shadow-xl scale-105' 
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.description}
                </p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  asChild 
                  variant={plan.popular ? "default" : "outline"} 
                  className="w-full"
                >
                  <Link href="/signup">
                    Start Free Trial
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* View All Plans Link */}
        <div className="text-center">
          <Button asChild variant="ghost">
            <Link href="/pricing">
              View Complete Plan Comparison
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
