import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Activity,
  BookOpen,
  Cpu,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

type AdminTab = 'overview' | 'users' | 'games' | 'analytics' | 'hardware' | 'settings'

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  // Mock admin stats - in production, these would come from API
  const stats = {
    totalUsers: 1250,
    activeToday: 89,
    totalGames: 8,
    totalLevels: 42,
    completionsToday: 156,
    avgScore: 78,
    hardwareJobs: 12,
    pendingJobs: 3,
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="container py-12 text-center">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          You need administrator privileges to access this page.
        </p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'games' as AdminTab, label: 'Games', icon: Gamepad2 },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: TrendingUp },
    { id: 'hardware' as AdminTab, label: 'Hardware', icon: Cpu },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              icon={Users}
              trend="+12%"
            />
            <StatCard
              title="Active Today"
              value={stats.activeToday.toString()}
              icon={Activity}
              trend="+5%"
            />
            <StatCard
              title="Completions Today"
              value={stats.completionsToday.toString()}
              icon={BookOpen}
              trend="+8%"
            />
            <StatCard
              title="Average Score"
              value={`${stats.avgScore}%`}
              icon={TrendingUp}
              trend="+2%"
            />
          </div>

          {/* Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { user: 'Alice', action: 'completed Quantum Pet Level 3', time: '2m ago' },
                    { user: 'Bob', action: 'joined Circuit Architect multiplayer', time: '5m ago' },
                    { user: 'Charlie', action: 'submitted to IBM Quantum', time: '12m ago' },
                    { user: 'Diana', action: 'earned "Superposition Master" badge', time: '18m ago' },
                    { user: 'Eve', action: 'started BB84 Protocol game', time: '25m ago' },
                  ].map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                    >
                      <span>
                        <strong>{activity.user}</strong> {activity.action}
                      </span>
                      <span className="text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <StatusItem label="API Server" status="healthy" />
                  <StatusItem label="Database" status="healthy" />
                  <StatusItem label="Redis Cache" status="healthy" />
                  <StatusItem label="Multiplayer Server" status="healthy" />
                  <StatusItem label="IBM Quantum" status="connected" />
                  <StatusItem label="Keycloak Auth" status="healthy" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="flex-1 px-3 py-2 bg-secondary rounded-lg"
                />
                <Button>Search</Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3">User</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Level</th>
                      <th className="text-left p-3">XP</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'John Doe', email: 'john@example.com', role: 'student', level: 'undergraduate', xp: 2450 },
                      { name: 'Jane Smith', email: 'jane@example.com', role: 'teacher', level: 'senior_high', xp: 1200 },
                      { name: 'Dr. Brown', email: 'brown@uni.edu', role: 'researcher', level: 'postgraduate', xp: 5600 },
                    ].map((user, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            'px-2 py-1 rounded text-xs',
                            user.role === 'admin' && 'bg-red-500/20 text-red-500',
                            user.role === 'teacher' && 'bg-blue-500/20 text-blue-500',
                            user.role === 'researcher' && 'bg-purple-500/20 text-purple-500',
                            user.role === 'student' && 'bg-green-500/20 text-green-500'
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{user.level.replace('_', ' ')}</td>
                        <td className="p-3">{user.xp.toLocaleString()}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <Card>
          <CardHeader>
            <CardTitle>Game Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Quantum Pet', plays: 523, avgScore: 82, levels: 5 },
                { name: 'Circuit Architect', plays: 412, avgScore: 75, levels: 8 },
                { name: 'Quantum Spy', plays: 389, avgScore: 68, levels: 3 },
                { name: 'Bloch Explorer', plays: 356, avgScore: 71, levels: 5 },
                { name: "Grover's Maze", plays: 245, avgScore: 64, levels: 4 },
                { name: 'Protocol Lab', plays: 198, avgScore: 58, levels: 3 },
              ].map((game, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">{game.name}</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plays</p>
                        <p className="font-medium">{game.plays}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Score</p>
                        <p className="font-medium">{game.avgScore}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Levels</p>
                        <p className="font-medium">{game.levels}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      Manage
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">
                  Chart visualization would go here (e.g., daily active users, completions over time)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Quantum Pet', completions: 523, rate: 78 },
                    { name: 'Circuit Architect', completions: 412, rate: 72 },
                    { name: 'Bloch Explorer', completions: 356, rate: 85 },
                  ].map((game, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{game.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {game.completions} completions ({game.rate}% rate)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Engagement by Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { level: 'Basic School', users: 245, pct: 20 },
                    { level: 'Junior High', users: 312, pct: 25 },
                    { level: 'Senior High', users: 289, pct: 23 },
                    { level: 'Undergraduate', users: 256, pct: 20 },
                    { level: 'Postgraduate', users: 148, pct: 12 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.level}</span>
                        <span className="text-muted-foreground">{item.users} users</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hardware Tab */}
      {activeTab === 'hardware' && (
        <Card>
          <CardHeader>
            <CardTitle>IBM Quantum Hardware</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground">IBM Quantum Runtime</p>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
                  Connected
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h4 className="font-medium mb-2">Jobs Today</h4>
                  <p className="text-3xl font-bold">{stats.hardwareJobs}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.pendingJobs} pending
                  </p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h4 className="font-medium mb-2">Available Backends</h4>
                  <p className="text-3xl font-bold">7</p>
                  <p className="text-sm text-muted-foreground">
                    5 simulators, 2 quantum
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3">Backend</th>
                      <th className="text-left p-3">Qubits</th>
                      <th className="text-left p-3">Queue</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'ibm_osaka', qubits: 127, queue: 12, status: 'online' },
                      { name: 'ibm_kyoto', qubits: 127, queue: 8, status: 'online' },
                      { name: 'ibmq_qasm_simulator', qubits: 32, queue: 0, status: 'online' },
                      { name: 'aer_simulator', qubits: 32, queue: 0, status: 'online' },
                    ].map((backend, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-mono">{backend.name}</td>
                        <td className="p-3">{backend.qubits}</td>
                        <td className="p-3">{backend.queue} jobs</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs">
                            {backend.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-w-xl">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Default Education Level
                </label>
                <select className="w-full p-2 bg-secondary rounded-lg">
                  <option>Basic School</option>
                  <option>Junior High</option>
                  <option>Senior High</option>
                  <option>Undergraduate</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Hardware Jobs per User (daily)
                </label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full p-2 bg-secondary rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Guest Play</p>
                  <p className="text-sm text-muted-foreground">
                    Let users try games without logging in
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Multiplayer</p>
                  <p className="text-sm text-muted-foreground">
                    Allow real-time multiplayer games
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">LTI Integration</p>
                  <p className="text-sm text-muted-foreground">
                    Allow LMS connections (Moodle, Canvas)
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>

              <Button className="mt-4">Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  icon: any
  trend: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-green-500">{trend}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          'text-xs px-2 py-1 rounded',
          status === 'healthy' && 'bg-green-500/20 text-green-500',
          status === 'connected' && 'bg-blue-500/20 text-blue-500',
          status === 'degraded' && 'bg-yellow-500/20 text-yellow-500',
          status === 'error' && 'bg-red-500/20 text-red-500'
        )}
      >
        {status}
      </span>
    </div>
  )
}
