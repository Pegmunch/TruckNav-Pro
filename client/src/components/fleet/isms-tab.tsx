import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Shield, AlertTriangle, CheckCircle, Clock,
  Plus, Edit, Trash2, Server, Users, Lock, Eye, RefreshCw, Monitor,
  TrendingUp, BookOpen, ClipboardList, Database
} from 'lucide-react';
import { format } from 'date-fns';

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
type RiskStatus = 'Open' | 'In Treatment' | 'Accepted' | 'Closed';
type IncidentStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
type AssetType = 'Hardware' | 'Software' | 'Data' | 'People' | 'Facility' | 'Service';
type ControlStatus = 'Implemented' | 'Partial' | 'Planned' | 'Not Applicable';

interface Risk {
  id: string;
  ref: string;
  asset: string;
  threat: string;
  vulnerability: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  level: RiskLevel;
  owner: string;
  treatment: string;
  status: RiskStatus;
  reviewDate: string;
  createdAt: string;
}

interface SecurityIncident {
  id: string;
  ref: string;
  title: string;
  type: string;
  severity: RiskLevel;
  description: string;
  affectedAssets: string;
  reportedBy: string;
  status: IncidentStatus;
  containment: string;
  resolution: string;
  reportedAt: string;
  resolvedAt?: string;
}

interface Asset {
  id: string;
  ref: string;
  name: string;
  type: AssetType;
  owner: string;
  location: string;
  classification: string;
  criticality: RiskLevel;
  description: string;
  addedAt: string;
}

interface Policy {
  id: string;
  ref: string;
  title: string;
  version: string;
  owner: string;
  reviewDate: string;
  status: 'Active' | 'Under Review' | 'Retired';
  acknowledgements: number;
  totalStaff: number;
  lastUpdated: string;
}

interface ISOControl {
  clause: string;
  title: string;
  description: string;
  status: ControlStatus;
  evidence: string;
  owner: string;
  lastReviewed: string;
}

const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const CONTROL_STATUS_COLOR: Record<ControlStatus, string> = {
  Implemented: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Not Applicable': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const ISO_27001_CONTROLS: ISOControl[] = [
  { clause: '5.1', title: 'Policies for information security', description: 'Management direction and support for information security in accordance with business requirements', status: 'Partial', evidence: 'Draft security policy exists', owner: 'CISO', lastReviewed: '2026-01-15' },
  { clause: '5.2', title: 'Information security roles and responsibilities', description: 'All responsibilities are defined and allocated', status: 'Planned', evidence: '', owner: 'HR', lastReviewed: '' },
  { clause: '6.1', title: 'Screening', description: 'Background verification checks for all staff and contractors', status: 'Partial', evidence: 'DBS checks for drivers', owner: 'HR', lastReviewed: '2026-01-10' },
  { clause: '6.3', title: 'Information security awareness, education and training', description: 'Staff receive appropriate security awareness training', status: 'Planned', evidence: '', owner: 'HR', lastReviewed: '' },
  { clause: '8.1', title: 'User endpoint devices', description: 'Information stored on or processed by user endpoint devices is protected', status: 'Partial', evidence: 'MDM policy draft', owner: 'IT', lastReviewed: '2026-02-01' },
  { clause: '8.2', title: 'Privileged access rights', description: 'Allocation of privileged access rights is restricted and managed', status: 'Implemented', evidence: 'Role-based access control active in fleet system', owner: 'IT', lastReviewed: '2026-02-10' },
  { clause: '8.3', title: 'Information access restriction', description: 'Access to information and application system functions is restricted in accordance with the access control policy', status: 'Implemented', evidence: 'Fleet system RBAC, driver access limited to own records', owner: 'IT', lastReviewed: '2026-02-10' },
  { clause: '8.5', title: 'Secure authentication', description: 'Secure authentication technologies and procedures are implemented', status: 'Implemented', evidence: 'Replit Auth OIDC, session management active', owner: 'IT', lastReviewed: '2026-02-10' },
  { clause: '8.6', title: 'Capacity management', description: 'Resource use is monitored and adjusted', status: 'Partial', evidence: 'Server monitoring via hosting provider', owner: 'IT', lastReviewed: '2026-01-20' },
  { clause: '8.7', title: 'Protection against malware', description: 'Protection against malware is implemented and supported by appropriate user awareness', status: 'Partial', evidence: 'Endpoint AV on office machines', owner: 'IT', lastReviewed: '2026-01-20' },
  { clause: '8.10', title: 'Information deletion', description: 'Information stored in information systems, devices or other storage media is deleted when no longer required', status: 'Planned', evidence: '', owner: 'IT', lastReviewed: '' },
  { clause: '8.11', title: 'Data masking', description: 'Data masking is used in accordance with access control policy', status: 'Planned', evidence: '', owner: 'IT', lastReviewed: '' },
  { clause: '8.12', title: 'Data leakage prevention', description: 'DLP measures are applied to systems and networks that process sensitive information', status: 'Planned', evidence: '', owner: 'IT', lastReviewed: '' },
  { clause: '8.13', title: 'Information backup', description: 'Backup copies of information, software and systems are maintained', status: 'Implemented', evidence: 'Neon DB daily backups, automated', owner: 'IT', lastReviewed: '2026-02-15' },
  { clause: '8.15', title: 'Logging', description: 'Logs that record activities, exceptions, faults and other relevant events are produced and stored', status: 'Implemented', evidence: 'Access logs, error logs, audit trail in fleet system', owner: 'IT', lastReviewed: '2026-02-15' },
  { clause: '8.16', title: 'Monitoring activities', description: 'Networks, systems and applications are monitored for anomalous behaviour', status: 'Partial', evidence: 'Basic uptime monitoring active', owner: 'IT', lastReviewed: '2026-01-25' },
  { clause: '8.20', title: 'Network security', description: 'Networks and network devices are secured, managed and controlled', status: 'Implemented', evidence: 'TLS/HTTPS enforced, Replit network isolation', owner: 'IT', lastReviewed: '2026-02-10' },
  { clause: '8.24', title: 'Use of cryptography', description: 'Rules for the effective use of cryptography are defined and implemented', status: 'Implemented', evidence: 'AES-256 encryption at rest, TLS 1.3 in transit', owner: 'IT', lastReviewed: '2026-02-10' },
  { clause: '8.25', title: 'Secure development life cycle', description: 'Rules for the secure development of software and systems are established', status: 'Partial', evidence: 'Code review process informal', owner: 'Dev', lastReviewed: '2026-01-15' },
  { clause: '8.28', title: 'Secure coding', description: 'Secure coding principles are applied to software development', status: 'Partial', evidence: 'Input validation, Zod schema validation active', owner: 'Dev', lastReviewed: '2026-01-15' },
  { clause: '8.32', title: 'Change management', description: 'Changes to information processing facilities and systems are subject to change management procedures', status: 'Planned', evidence: '', owner: 'IT', lastReviewed: '' },
  { clause: '8.34', title: 'Protection of information systems during audit testing', description: 'Audit tests and other assurance activities involving assessment of operational systems are planned and agreed', status: 'Not Applicable', evidence: 'N/A at current stage', owner: 'IT', lastReviewed: '' },
];

const INITIAL_RISKS: Risk[] = [
  { id: '1', ref: 'RSK-001', asset: 'Driver GPS & Location Data', threat: 'Unauthorised data access', vulnerability: 'Weak session management', likelihood: 2, impact: 4, riskScore: 8, level: 'High', owner: 'IT Manager', treatment: 'Implement session timeout and MFA', status: 'In Treatment', reviewDate: '2026-04-01', createdAt: '2026-01-15' },
  { id: '2', ref: 'RSK-002', asset: 'Fleet Telematics Data', threat: 'Data breach via API', vulnerability: 'Insecure API endpoints', likelihood: 2, impact: 5, riskScore: 10, level: 'Critical', owner: 'IT Manager', treatment: 'API key rotation, rate limiting, input validation', status: 'In Treatment', reviewDate: '2026-03-15', createdAt: '2026-01-20' },
  { id: '3', ref: 'RSK-003', asset: 'Driver Personal Information', threat: 'Insider threat', vulnerability: 'Excessive access permissions', likelihood: 2, impact: 4, riskScore: 8, level: 'High', owner: 'HR Manager', treatment: 'Role-based access control, access reviews quarterly', status: 'In Treatment', reviewDate: '2026-04-01', createdAt: '2026-01-25' },
  { id: '4', ref: 'RSK-004', asset: 'Vehicle Route History', threat: 'Data loss', vulnerability: 'No tested recovery procedure', likelihood: 2, impact: 3, riskScore: 6, level: 'Medium', owner: 'IT Manager', treatment: 'Automated daily backups, annual DR test', status: 'Open', reviewDate: '2026-05-01', createdAt: '2026-02-01' },
  { id: '5', ref: 'RSK-005', asset: 'Payment Card Data (Stripe)', threat: 'Payment fraud', vulnerability: 'Third-party dependency', likelihood: 1, impact: 5, riskScore: 5, level: 'Medium', owner: 'Finance Manager', treatment: 'PCI-DSS compliant processor (Stripe), no card data stored locally', status: 'Accepted', reviewDate: '2026-06-01', createdAt: '2026-02-05' },
];

const INITIAL_INCIDENTS: SecurityIncident[] = [
  { id: '1', ref: 'INC-001', title: 'Failed login attempt spike', type: 'Brute Force Attempt', severity: 'Medium', description: 'Automated monitoring detected 47 failed login attempts from a single IP over 10 minutes', affectedAssets: 'Fleet Management Portal', reportedBy: 'System Monitor', status: 'Resolved', containment: 'IP blocked at firewall level', resolution: 'Rate limiting applied, IP permanently blocked', reportedAt: '2026-02-10T09:23:00', resolvedAt: '2026-02-10T10:15:00' },
];

const INITIAL_ASSETS: Asset[] = [
  { id: '1', ref: 'AST-001', name: 'Fleet Management Application', type: 'Software', owner: 'IT Manager', location: 'Cloud (Replit)', classification: 'Confidential', criticality: 'Critical', description: 'Primary fleet management SaaS platform including driver data, vehicle telematics and routing', addedAt: '2026-01-01' },
  { id: '2', ref: 'AST-002', name: 'PostgreSQL Database (Neon)', type: 'Data', owner: 'IT Manager', location: 'Cloud (Neon Serverless)', classification: 'Restricted', criticality: 'Critical', description: 'Contains all fleet data, driver PII, route history, and operational records', addedAt: '2026-01-01' },
  { id: '3', ref: 'AST-003', name: 'Driver Mobile Devices', type: 'Hardware', owner: 'Fleet Manager', location: 'In-Vehicle', classification: 'Internal', criticality: 'High', description: 'iOS/Android devices used by drivers running TruckNav Pro application', addedAt: '2026-01-15' },
  { id: '4', ref: 'AST-004', name: 'TomTom API Integration', type: 'Service', owner: 'IT Manager', location: 'External (TomTom)', classification: 'Internal', criticality: 'High', description: 'Routing, traffic and mapping API. Loss of access would disable navigation', addedAt: '2026-01-15' },
  { id: '5', ref: 'AST-005', name: 'Stripe Payment Processing', type: 'Service', owner: 'Finance Manager', location: 'External (Stripe)', classification: 'Restricted', criticality: 'High', description: 'Subscription billing processor. PCI-DSS compliant third party', addedAt: '2026-01-20' },
  { id: '6', ref: 'AST-006', name: 'Fleet Management Staff', type: 'People', owner: 'HR Manager', location: 'Office / Remote', classification: 'Internal', criticality: 'High', description: 'Staff with administrative access to fleet management system and driver data', addedAt: '2026-01-01' },
];

const INITIAL_POLICIES: Policy[] = [
  { id: '1', ref: 'POL-001', title: 'Information Security Policy', version: '1.0', owner: 'CISO', reviewDate: '2027-01-01', status: 'Active', acknowledgements: 8, totalStaff: 12, lastUpdated: '2026-01-15' },
  { id: '2', ref: 'POL-002', title: 'Acceptable Use Policy', version: '1.1', owner: 'IT Manager', reviewDate: '2027-01-01', status: 'Active', acknowledgements: 10, totalStaff: 12, lastUpdated: '2026-01-20' },
  { id: '3', ref: 'POL-003', title: 'Data Retention & Deletion Policy', version: '0.9', owner: 'Data Protection Officer', reviewDate: '2026-06-01', status: 'Under Review', acknowledgements: 0, totalStaff: 12, lastUpdated: '2026-02-01' },
  { id: '4', ref: 'POL-004', title: 'Incident Response Policy', version: '1.0', owner: 'IT Manager', reviewDate: '2027-01-01', status: 'Active', acknowledgements: 6, totalStaff: 12, lastUpdated: '2026-01-25' },
  { id: '5', ref: 'POL-005', title: 'Access Control Policy', version: '1.0', owner: 'IT Manager', reviewDate: '2027-01-01', status: 'Active', acknowledgements: 11, totalStaff: 12, lastUpdated: '2026-01-18' },
];

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

function ComplianceScoreCard({ controls }: { controls: ISOControl[] }) {
  const implemented = controls.filter(c => c.status === 'Implemented').length;
  const partial = controls.filter(c => c.status === 'Partial').length;
  const planned = controls.filter(c => c.status === 'Planned').length;
  const na = controls.filter(c => c.status === 'Not Applicable').length;
  const applicable = controls.length - na;
  const score = applicable > 0 ? Math.round(((implemented + partial * 0.5) / applicable) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2">
        <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="2.5"
                strokeDasharray={`${score} ${100 - score}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{score}%</span>
              <span className="text-xs text-muted-foreground">Compliance</span>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-center">ISO 27001 Overall Score</p>
          <p className="text-xs text-muted-foreground text-center mt-1">{implemented} of {applicable} applicable controls implemented</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-sm">Implemented</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{implemented}</p>
          <p className="text-xs text-muted-foreground mt-1">controls fully in place</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-sm">Partial / Planned</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{partial + planned}</p>
          <p className="text-xs text-muted-foreground mt-1">controls in progress</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-sm">Open Risks</span>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {INITIAL_RISKS.filter(r => r.status === 'Open' || r.status === 'In Treatment').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">requiring treatment</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskRegister() {
  const [risks, setRisks] = useState<Risk[]>(INITIAL_RISKS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [form, setForm] = useState({ asset: '', threat: '', vulnerability: '', likelihood: '1', impact: '1', owner: '', treatment: '', reviewDate: '', status: 'Open' as RiskStatus });

  const openAdd = () => {
    setEditingRisk(null);
    setForm({ asset: '', threat: '', vulnerability: '', likelihood: '1', impact: '1', owner: '', treatment: '', reviewDate: '', status: 'Open' });
    setDialogOpen(true);
  };

  const openEdit = (r: Risk) => {
    setEditingRisk(r);
    setForm({ asset: r.asset, threat: r.threat, vulnerability: r.vulnerability, likelihood: String(r.likelihood), impact: String(r.impact), owner: r.owner, treatment: r.treatment, reviewDate: r.reviewDate, status: r.status });
    setDialogOpen(true);
  };

  const save = () => {
    const likelihood = parseInt(form.likelihood);
    const impact = parseInt(form.impact);
    const riskScore = likelihood * impact;
    const level = riskLevelFromScore(riskScore);
    if (editingRisk) {
      setRisks(prev => prev.map(r => r.id === editingRisk.id ? { ...r, ...form, likelihood, impact, riskScore, level } : r));
    } else {
      const next = risks.length + 1;
      setRisks(prev => [...prev, { id: String(Date.now()), ref: `RSK-${String(next).padStart(3,'0')}`, ...form, likelihood, impact, riskScore, level, createdAt: new Date().toISOString().slice(0,10) }]);
    }
    setDialogOpen(false);
  };

  const remove = (id: string) => setRisks(prev => prev.filter(r => r.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Register</h3>
          <p className="text-sm text-muted-foreground">ISO 27005 information security risk assessment and treatment</p>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1" />Add Risk</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(['Critical', 'High', 'Medium', 'Low'] as RiskLevel[]).map(level => (
          <Card key={level} className="text-center">
            <CardContent className="pt-4 pb-3">
              <Badge className={`${RISK_LEVEL_COLOR[level]} mb-1`}>{level}</Badge>
              <p className="text-2xl font-bold">{risks.filter(r => r.level === level && r.status !== 'Closed').length}</p>
              <p className="text-xs text-muted-foreground">active risks</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Threat</TableHead>
              <TableHead>L</TableHead>
              <TableHead>I</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                <TableCell className="max-w-[120px] truncate text-xs">{r.asset}</TableCell>
                <TableCell className="max-w-[120px] truncate text-xs">{r.threat}</TableCell>
                <TableCell className="text-center">{r.likelihood}</TableCell>
                <TableCell className="text-center">{r.impact}</TableCell>
                <TableCell className="text-center font-bold">{r.riskScore}</TableCell>
                <TableCell><Badge className={`text-xs ${RISK_LEVEL_COLOR[r.level]}`}>{r.level}</Badge></TableCell>
                <TableCell className="text-xs">{r.owner}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{r.reviewDate}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {risks.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No risks recorded</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Information Asset</Label><Input value={form.asset} onChange={e => setForm(f => ({...f, asset: e.target.value}))} placeholder="e.g. Driver GPS Data" /></div>
              <div className="col-span-2 space-y-1"><Label>Threat</Label><Input value={form.threat} onChange={e => setForm(f => ({...f, threat: e.target.value}))} placeholder="e.g. Unauthorised access" /></div>
              <div className="col-span-2 space-y-1"><Label>Vulnerability</Label><Input value={form.vulnerability} onChange={e => setForm(f => ({...f, vulnerability: e.target.value}))} placeholder="e.g. Weak authentication" /></div>
              <div className="space-y-1">
                <Label>Likelihood (1–5)</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.likelihood} onChange={e => setForm(f => ({...f, likelihood: e.target.value}))}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Impact (1–5)</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.impact} onChange={e => setForm(f => ({...f, impact: e.target.value}))}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Risk Owner</Label><Input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} placeholder="Name / Role" /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as RiskStatus}))}>
                  {(['Open','In Treatment','Accepted','Closed'] as RiskStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1"><Label>Treatment Plan</Label><Input value={form.treatment} onChange={e => setForm(f => ({...f, treatment: e.target.value}))} placeholder="Describe mitigation actions" /></div>
              <div className="space-y-1"><Label>Review Date</Label><Input type="date" value={form.reviewDate} onChange={e => setForm(f => ({...f, reviewDate: e.target.value}))} /></div>
              <div className="flex items-end pb-1">
                <div className="w-full p-2 rounded bg-muted text-sm">
                  <span className="text-muted-foreground">Risk Score: </span>
                  <span className="font-bold">{parseInt(form.likelihood) * parseInt(form.impact)}</span>
                  <span className="ml-2"><Badge className={`text-xs ${RISK_LEVEL_COLOR[riskLevelFromScore(parseInt(form.likelihood) * parseInt(form.impact))]}`}>{riskLevelFromScore(parseInt(form.likelihood) * parseInt(form.impact))}</Badge></span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.asset || !form.threat}>{editingRisk ? 'Update' : 'Add Risk'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecurityIncidents() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>(INITIAL_INCIDENTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: '', severity: 'Medium' as RiskLevel, description: '', affectedAssets: '', reportedBy: '', containment: '', resolution: '', status: 'Open' as IncidentStatus });

  const save = () => {
    const next = incidents.length + 1;
    setIncidents(prev => [...prev, { id: String(Date.now()), ref: `INC-${String(next).padStart(3,'0')}`, ...form, reportedAt: new Date().toISOString() }]);
    setDialogOpen(false);
    setForm({ title: '', type: '', severity: 'Medium', description: '', affectedAssets: '', reportedBy: '', containment: '', resolution: '', status: 'Open' });
  };

  const updateStatus = (id: string, status: IncidentStatus) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status, resolvedAt: status === 'Resolved' || status === 'Closed' ? new Date().toISOString() : i.resolvedAt } : i));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Security Incidents</h3>
          <p className="text-sm text-muted-foreground">Log and track information security incidents and near-misses</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" />Report Incident</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(['Open','Investigating','Resolved','Closed'] as IncidentStatus[]).map(s => (
          <Card key={s} className="text-center">
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{incidents.filter(i => i.status === s).length}</p>
              <p className="text-xs text-muted-foreground">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {incidents.map(inc => (
          <Card key={inc.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{inc.ref}</span>
                    <span className="font-semibold text-sm">{inc.title}</span>
                    <Badge className={`text-xs ${RISK_LEVEL_COLOR[inc.severity]}`}>{inc.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{inc.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{inc.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>Affected: {inc.affectedAssets}</span>
                    <span>Reported by: {inc.reportedBy}</span>
                    <span>Reported: {new Date(inc.reportedAt).toLocaleString()}</span>
                    {inc.resolvedAt && <span>Resolved: {new Date(inc.resolvedAt).toLocaleString()}</span>}
                  </div>
                  {inc.containment && <p className="text-xs mt-1"><span className="font-medium">Containment:</span> {inc.containment}</p>}
                  {inc.resolution && <p className="text-xs mt-1"><span className="font-medium">Resolution:</span> {inc.resolution}</p>}
                </div>
                <div className="flex flex-col gap-1 min-w-[110px]">
                  <Badge variant={inc.status === 'Closed' ? 'secondary' : inc.status === 'Resolved' ? 'default' : 'destructive'} className="text-center justify-center">{inc.status}</Badge>
                  {inc.status !== 'Closed' && (
                    <select className="text-xs rounded border bg-background px-1 py-1" value={inc.status} onChange={e => updateStatus(inc.id, e.target.value as IncidentStatus)}>
                      {(['Open','Investigating','Resolved','Closed'] as IncidentStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {incidents.length === 0 && <p className="text-center text-muted-foreground py-8">No security incidents recorded</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Report Security Incident</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Brief incident description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Incident Type</Label><Input value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} placeholder="e.g. Data Breach, Phishing" /></div>
              <div className="space-y-1">
                <Label>Severity</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value as RiskLevel}))}>
                  {(['Critical','High','Medium','Low'] as RiskLevel[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What happened?" /></div>
            <div className="space-y-1"><Label>Affected Assets / Systems</Label><Input value={form.affectedAssets} onChange={e => setForm(f => ({...f, affectedAssets: e.target.value}))} /></div>
            <div className="space-y-1"><Label>Reported By</Label><Input value={form.reportedBy} onChange={e => setForm(f => ({...f, reportedBy: e.target.value}))} /></div>
            <div className="space-y-1"><Label>Immediate Containment Actions</Label><Input value={form.containment} onChange={e => setForm(f => ({...f, containment: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title}>Submit Incident</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetRegister() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Software' as AssetType, owner: '', location: '', classification: 'Internal', criticality: 'Medium' as RiskLevel, description: '' });

  const save = () => {
    const next = assets.length + 1;
    setAssets(prev => [...prev, { id: String(Date.now()), ref: `AST-${String(next).padStart(3,'0')}`, ...form, addedAt: new Date().toISOString().slice(0,10) }]);
    setDialogOpen(false);
    setForm({ name: '', type: 'Software', owner: '', location: '', classification: 'Internal', criticality: 'Medium', description: '' });
  };

  const remove = (id: string) => setAssets(prev => prev.filter(a => a.id !== id));

  const assetTypeIcon = (type: AssetType) => {
    const icons: Record<AssetType, React.ReactNode> = {
      Hardware: <Server className="w-4 h-4" />, Software: <Monitor className="w-4 h-4" />, Data: <Database className="w-4 h-4" />,
      People: <Users className="w-4 h-4" />, Facility: <Shield className="w-4 h-4" />, Service: <RefreshCw className="w-4 h-4" />
    };
    return icons[type];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Information Asset Register</h3>
          <p className="text-sm text-muted-foreground">Inventory of all information assets requiring security protection</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" />Add Asset</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.ref}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs">
                    {assetTypeIcon(a.type)} {a.type}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{a.classification}</Badge></TableCell>
                <TableCell><Badge className={`text-xs ${RISK_LEVEL_COLOR[a.criticality]}`}>{a.criticality}</Badge></TableCell>
                <TableCell className="text-xs">{a.owner}</TableCell>
                <TableCell className="text-xs">{a.location}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => remove(a.id)}><Trash2 className="w-3 h-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Information Asset</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Asset Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Fleet Database" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Asset Type</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as AssetType}))}>
                  {(['Hardware','Software','Data','People','Facility','Service'] as AssetType[]).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Criticality</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.criticality} onChange={e => setForm(f => ({...f, criticality: e.target.value as RiskLevel}))}>
                  {(['Critical','High','Medium','Low'] as RiskLevel[]).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Owner</Label><Input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} /></div>
              <div className="space-y-1"><Label>Location / Hosting</Label><Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Data Classification</Label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.classification} onChange={e => setForm(f => ({...f, classification: e.target.value}))}>
                {['Public','Internal','Confidential','Restricted'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Brief description of the asset" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);

  const ackPercent = (p: Policy) => p.totalStaff > 0 ? Math.round((p.acknowledgements / p.totalStaff) * 100) : 0;

  const statusColor: Record<Policy['status'], string> = {
    Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Under Review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    Retired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Policy Management</h3>
          <p className="text-sm text-muted-foreground">Track information security policies, versions and staff acknowledgements</p>
        </div>
        <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Policy</Button>
      </div>

      <div className="space-y-3">
        {policies.map(p => (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.ref} v{p.version}</span>
                    <Badge className={`text-xs ${statusColor[p.status]}`}>{p.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-x-6 text-xs text-muted-foreground mt-2">
                    <span>Owner: {p.owner}</span>
                    <span>Last Updated: {p.lastUpdated}</span>
                    <span>Review Due: {p.reviewDate}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Staff Acknowledgements</span>
                      <span className="font-medium">{p.acknowledgements}/{p.totalStaff} ({ackPercent(p)}%)</span>
                    </div>
                    <Progress value={ackPercent(p)} className="h-2" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8"><Edit className="w-3 h-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">Policy Tip</p>
              <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">ISO 27001 clause 5.1 requires an overarching Information Security Policy approved by top management. All policies should be reviewed at planned intervals or after significant changes. Ensure 100% staff acknowledgement is tracked for audit evidence.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ISOControls() {
  const [controls, setControls] = useState<ISOControl[]>(ISO_27001_CONTROLS);
  const [filter, setFilter] = useState<ControlStatus | 'All'>('All');

  const filtered = filter === 'All' ? controls : controls.filter(c => c.status === filter);

  const update = (clause: string, field: keyof ISOControl, value: string) => {
    setControls(prev => prev.map(c => c.clause === clause ? { ...c, [field]: value } : c));
  };

  const stats = {
    Implemented: controls.filter(c => c.status === 'Implemented').length,
    Partial: controls.filter(c => c.status === 'Partial').length,
    Planned: controls.filter(c => c.status === 'Planned').length,
    'Not Applicable': controls.filter(c => c.status === 'Not Applicable').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">ISO 27001:2022 Controls</h3>
          <p className="text-sm text-muted-foreground">Track implementation status of Annex A information security controls</p>
        </div>
        <div className="flex gap-2">
          {(['All', 'Implemented', 'Partial', 'Planned', 'Not Applicable'] as const).map(s => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} className="text-xs" onClick={() => setFilter(s)}>
              {s === 'All' ? `All (${controls.length})` : `${s} (${stats[s as ControlStatus] ?? 0})`}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <Card key={c.clause} className="overflow-hidden">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <div className="text-xs font-mono font-bold text-muted-foreground w-10 pt-0.5 shrink-0">{c.clause}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      {c.evidence && <p className="text-xs mt-1 text-green-700 dark:text-green-400"><span className="font-medium">Evidence:</span> {c.evidence}</p>}
                    </div>
                    <div className="flex flex-col gap-1 min-w-[140px] items-end">
                      <select
                        className="text-xs rounded border bg-background px-2 py-1 w-full"
                        value={c.status}
                        onChange={e => update(c.clause, 'status', e.target.value as ControlStatus)}
                      >
                        {(['Implemented','Partial','Planned','Not Applicable'] as ControlStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Badge className={`text-xs w-full justify-center ${CONTROL_STATUS_COLOR[c.status]}`}>{c.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    {c.owner && <span>Owner: {c.owner}</span>}
                    {c.lastReviewed && <span>Last reviewed: {c.lastReviewed}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ISMSTab() {
  const [section, setSection] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Information Security Management System</h2>
          <p className="text-sm text-muted-foreground">ISO 27001:2022 / ISO 27005 — Risk-based ISMS for fleet operations</p>
        </div>
        <Badge className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">ISMS Active</Badge>
      </div>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" />Compliance Overview
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />Risk Register
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-1.5 text-xs">
            <ClipboardList className="w-3.5 h-3.5" />Security Incidents
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1.5 text-xs">
            <Database className="w-3.5 h-3.5" />Asset Register
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />Policies
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-1.5 text-xs">
            <CheckCircle className="w-3.5 h-3.5" />ISO 27001 Controls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <ComplianceScoreCard controls={ISO_27001_CONTROLS} />

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Recent Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { text: 'Role-based access control implemented in fleet system', date: '10 Feb 2026' },
                  { text: 'Automated daily database backups confirmed active', date: '15 Feb 2026' },
                  { text: 'TLS 1.3 encryption enforced across all endpoints', date: '10 Feb 2026' },
                  { text: 'Audit logging active for all fleet management actions', date: '10 Feb 2026' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p>{item.text}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { text: 'Complete Data Retention & Deletion Policy (POL-003)', priority: 'High' },
                  { text: 'Schedule ISO 27001 gap analysis with auditor', priority: 'High' },
                  { text: 'Complete staff security awareness training (4 outstanding)', priority: 'Medium' },
                  { text: 'Formalise change management procedure', priority: 'Medium' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge className={`text-xs mt-0.5 shrink-0 ${item.priority === 'High' ? RISK_LEVEL_COLOR.High : RISK_LEVEL_COLOR.Medium}`}>{item.priority}</Badge>
                    <p>{item.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ISO 27001 Certification Roadmap</CardTitle>
              <CardDescription>Estimated timeline to achieve ISO 27001 certification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { phase: 'Phase 1: Foundation', desc: 'Complete ISMS scope, policies, asset register, risk assessment', status: 'In Progress', date: 'Q2 2026' },
                  { phase: 'Phase 2: Controls', desc: 'Implement remaining ISO 27001 Annex A controls, staff training', status: 'Planned', date: 'Q3 2026' },
                  { phase: 'Phase 3: Internal Audit', desc: 'Internal ISMS audit, management review, corrective actions', status: 'Planned', date: 'Q3 2026' },
                  { phase: 'Phase 4: Stage 1 Audit', desc: 'Formal documentation review by accredited certification body', status: 'Planned', date: 'Q4 2026' },
                  { phase: 'Phase 5: Stage 2 Audit', desc: 'On-site audit, evidence review, certification decision', status: 'Planned', date: 'Q1 2027' },
                  { phase: 'Phase 6: Certification', desc: 'ISO 27001 certificate issued, surveillance audits begin', status: 'Target', date: 'Q1 2027' },
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${p.status === 'In Progress' ? 'bg-blue-600 text-white' : p.status === 'Target' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-muted-foreground'}`}>{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.phase}</p>
                        <Badge variant="outline" className="text-xs">{p.date}</Badge>
                        {p.status === 'In Progress' && <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">In Progress</Badge>}
                        {p.status === 'Target' && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Target</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="mt-6"><RiskRegister /></TabsContent>
        <TabsContent value="incidents" className="mt-6"><SecurityIncidents /></TabsContent>
        <TabsContent value="assets" className="mt-6"><AssetRegister /></TabsContent>
        <TabsContent value="policies" className="mt-6"><PolicyManagement /></TabsContent>
        <TabsContent value="controls" className="mt-6"><ISOControls /></TabsContent>
      </Tabs>
    </div>
  );
}
