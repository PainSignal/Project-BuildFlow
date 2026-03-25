import { Star, Users, Building2, TrendingUp } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "BuildFlow has transformed how we manage our construction projects. The ability to track everything in one place has saved us countless hours and reduced costly mistakes.",
    author: "Mike Richardson",
    role: "Project Manager",
    company: "Summit Construction Group",
    rating: 5
  },
  {
    quote: "Finally, a tool that understands the construction industry. The permit tracking alone has prevented multiple compliance issues. Worth every penny.",
    author: "Sarah Chen",
    role: "Operations Director",
    company: "Pacific Builders Inc",
    rating: 5
  },
  {
    quote: "Our team collaboration has improved dramatically. Field supervisors and office staff are finally on the same page. Highly recommend BuildFlow.",
    author: "James Martinez",
    role: "General Contractor",
    company: "Martinez Construction",
    rating: 5
  }
];

const STATS = [
  {
    icon: Building2,
    value: "500+",
    label: "Construction Companies"
  },
  {
    icon: Users,
    value: "2,500+",
    label: "Active Users"
  },
  {
    icon: TrendingUp,
    value: "$50M+",
    label: "Project Value Managed"
  },
  {
    icon: Star,
    value: "4.9/5",
    label: "Customer Rating"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Construction Professionals
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            See what industry leaders are saying about BuildFlow
          </p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {STATS.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                "{testimonial.quote}"
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
