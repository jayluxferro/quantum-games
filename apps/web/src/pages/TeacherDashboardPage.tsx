import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Download,
  GraduationCap,
  LineChart,
  Plus,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'

export default function TeacherDashboardPage() {
  const { user, isAuthenticated, token } = useAuthStore()
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  // Mock course data - in production would come from API
  const courses = [
    {
      id: '1',
      name: 'Introduction to Quantum Computing',
      students: 28,
      avgProgress: 67,
      assignments: 5,
    },
    {
      id: '2',
      name: 'Advanced Quantum Algorithms',
      students: 15,
      avgProgress: 45,
      assignments: 3,
    },
  ]

  const studentProgress = [
    { name: 'Alice Johnson', progress: 85, score: 92, level: 'Qubit Master' },
    { name: 'Bob Smith', progress: 72, score: 78, level: 'Circuit Builder' },
    { name: 'Carol Williams', progress: 65, score: 81, level: 'Quantum Explorer' },
    { name: 'David Brown', progress: 58, score: 65, level: 'Beginner' },
    { name: 'Eve Davis', progress: 45, score: 72, level: 'Beginner' },
  ]

  if (!isAuthenticated || (user?.role !== 'teacher' && user?.role !== 'admin')) {
    return (
      <div className="container py-12 text-center">
        <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Teacher Access Required</h1>
        <p className="text-muted-foreground">
          This dashboard is available for teachers and administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <Users className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">43</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <BookOpen className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-muted-foreground">Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Trophy className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">78%</p>
            <p className="text-sm text-muted-foreground">Avg Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <LineChart className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">82</p>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Courses */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Your Courses</h2>
          {courses.map((course) => (
            <Card
              key={course.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedCourse === course.id && 'border-primary'
              )}
              onClick={() => setSelectedCourse(course.id)}
            >
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">{course.name}</h3>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{course.students} students</span>
                  <span>{course.assignments} assignments</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Average Progress</span>
                    <span>{course.avgProgress}%</span>
                  </div>
                  <Progress value={course.avgProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>

        {/* Student Progress */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Progress</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentProgress.map((student, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.level}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{student.progress}%</p>
                        <p className="text-xs text-muted-foreground">Progress</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{student.score}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <div className="w-24">
                        <Progress value={student.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Builder */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Assignment Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Game
                  </label>
                  <select className="w-full p-2 bg-secondary rounded-lg">
                    <option>Quantum Pet</option>
                    <option>Circuit Architect</option>
                    <option>Quantum Spy (BB84)</option>
                    <option>Bloch Sphere Explorer</option>
                    <option>Grover's Maze</option>
                    <option>Protocol Lab</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Level Range
                    </label>
                    <div className="flex gap-2">
                      <select className="flex-1 p-2 bg-secondary rounded-lg">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                      </select>
                      <span className="self-center">to</span>
                      <select className="flex-1 p-2 bg-secondary rounded-lg">
                        <option>3</option>
                        <option>4</option>
                        <option>5</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 bg-secondary rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Minimum Stars Required
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((stars) => (
                      <Button
                        key={stars}
                        variant="outline"
                        className="flex-1"
                      >
                        {'⭐'.repeat(stars)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  Create Assignment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
