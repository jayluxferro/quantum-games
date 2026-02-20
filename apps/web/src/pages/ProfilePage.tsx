import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Clock,
  Settings,
  LogIn
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to track your progress and earn achievements.
        </p>
        <Button variant="quantum" asChild>
          <Link to="/login">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Link>
        </Button>
      </div>
    )
  }

  const stats = {
    totalXP: user?.total_xp || 0,
    completedLevels: 0,
    totalStars: 0,
    achievements: 0,
    gamesPlayed: 0,
    timePlayed: 0,
  }

  const level = Math.floor(stats.totalXP / 100) + 1
  const xpProgress = stats.totalXP % 100

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="h-24 w-24 rounded-full quantum-gradient mx-auto flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-white">
                    {(user?.display_name || user?.username || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold">
                  {user?.display_name || user?.username}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
                
                <div className="mt-4 p-4 bg-secondary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Level {level}</span>
                    <span className="text-sm">{xpProgress}/100 XP</span>
                  </div>
                  <Progress value={xpProgress} />
                </div>

                <Button variant="outline" className="mt-4 w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalXP}</div>
                    <div className="text-sm text-muted-foreground">Total XP</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.completedLevels}</div>
                    <div className="text-sm text-muted-foreground">Levels Complete</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalStars}</div>
                    <div className="text-sm text-muted-foreground">Stars Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.achievements}</div>
                    <div className="text-sm text-muted-foreground">Achievements</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.timePlayed}h</div>
                    <div className="text-sm text-muted-foreground">Time Played</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No achievements yet</p>
                <p className="text-sm">Complete games to earn achievements!</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Start playing to see your activity here!</p>
                <Button className="mt-4" asChild>
                  <Link to="/games">Browse Games</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
