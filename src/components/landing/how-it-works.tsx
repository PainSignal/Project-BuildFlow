import { UserPlus, Users, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    step: "Step 1",
    title: "Sign Up & Set Up Organization",
    description: "Create your account and configure your organization profile. Import your company details and customize settings to match your workflow.",
    color: "bg-blue-600"
  },
  {
    icon: Users,
    step: "Step 2",
    title: "Invite Team Members",
    description: "Add your team members with role-based permissions. Office staff, field supervisors, and clients all get appropriate access levels.",
    color: "bg-green-600"
  },
  {
    icon: Rocket,
    step: "Step 3",
    title: "Start Managing Projects",
    description: "Create your first project, set up tasks, manage budgets, and start collaborating. Full productivity from day one.",
    color: "bg-purple-600"
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No complex setup or lengthy onboarding. Have your team up and running quickly.
          </p>
        </div>
        
        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-800 -translate-y-1/2 z-0" />
              )}
              
              {/* Step Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`${step.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                
                {/* Step Number */}
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  {step.step}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ready to transform how you manage construction projects?
          </p>
        </div>
      </div>
    </section>
  );
}
