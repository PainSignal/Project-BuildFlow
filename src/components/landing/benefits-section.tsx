import { CheckCircle2 } from "lucide-react";

const BENEFITS = [
  {
    title: "Reduce Administrative Overhead",
    description: "Automate manual tasks and eliminate paperwork. Save 10+ hours per week on administrative work.",
    stat: "10+ hrs/week saved"
  },
  {
    title: "Centralize Project Information",
    description: "No more scattered spreadsheets or lost documents. Everything you need in one secure location.",
    stat: "100% visibility"
  },
  {
    title: "Improve Team Communication",
    description: "Keep field and office teams synchronized. Reduce miscommunication and costly rework.",
    stat: "40% fewer errors"
  },
  {
    title: "Track Costs in Real-Time",
    description: "Monitor budget health continuously. Catch overruns before they become problems.",
    stat: "15% cost reduction"
  },
  {
    title: "Never Miss Permit Deadlines",
    description: "Automated tracking and reminders ensure compliance. Avoid costly delays and penalties.",
    stat: "Zero missed deadlines"
  },
  {
    title: "Scale Your Operations",
    description: "Handle more projects without adding overhead. Grow your business without the growing pains.",
    stat: "2x capacity"
  }
];

export function BenefitsSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Construction Professionals Choose BuildFlow
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Built by industry veterans who understand the daily challenges of construction management.
          </p>
        </div>
        
        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BENEFITS.map((benefit, index) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <div className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                  {benefit.stat}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
