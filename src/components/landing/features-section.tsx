import { 
  Building2, 
  CheckSquare, 
  DollarSign, 
  Users, 
  FileText, 
  BarChart3,
  ClipboardCheck,
  HardHat
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Building2,
    title: "Project Management",
    description: "Track projects from inception to completion. Manage budgets, timelines, and resources all in one centralized dashboard."
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Assign tasks to team members, track progress, and ensure nothing falls through the cracks. Field and office stay connected."
  },
  {
    icon: DollarSign,
    title: "Financial Control",
    description: "Create purchase orders, track expenses, and monitor budget health in real-time. Never lose sight of project costs."
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Role-based access control keeps everyone on the same page. Invite team members and manage permissions effortlessly."
  },
  {
    icon: FileText,
    title: "Permit Tracking",
    description: "Manage permits and compliance documents. Track approval status and never miss a critical deadline."
  },
  {
    icon: BarChart3,
    title: "Reporting & Analytics",
    description: "Generate insights with powerful reporting tools. Make data-driven decisions with real-time project analytics."
  },
  {
    icon: ClipboardCheck,
    title: "Quality Control",
    description: "Standardize inspections and quality checks. Ensure every project meets your standards and client expectations."
  },
  {
    icon: HardHat,
    title: "Client Portal",
    description: "Give clients visibility into their projects. Share updates, approve changes, and maintain transparent communication."
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Run Your Projects
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Powerful features designed specifically for construction professionals. 
            Manage every aspect of your operations from one intuitive platform.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
