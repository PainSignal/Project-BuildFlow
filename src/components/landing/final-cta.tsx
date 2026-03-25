import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-blue-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          
          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Construction Business?
          </h2>
          
          {/* Subheadline */}
          <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join hundreds of construction professionals who trust BuildFlow to manage their projects, 
            teams, and finances. Start your free trial today.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button asChild size="lg" variant="secondary" className="text-base px-8 py-6 w-full sm:w-auto">
              <Link href="/signup">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline" className="text-base px-8 py-6 w-full sm:w-auto border-white text-white hover:bg-white/10">
              <Link href="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-100">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              Instant setup
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="mt-10 pt-10 border-t border-white/20">
            <p className="text-blue-100 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-white underline hover:no-underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
