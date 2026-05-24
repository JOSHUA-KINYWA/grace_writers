import { useMemo } from 'react'

interface PasswordStrengthProps {
  password: string
  showRequirements?: boolean
}

export interface PasswordStrengthResult {
  score: number // 0-5
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  const metRequirements = Object.values(requirements).filter(Boolean).length

  let score = metRequirements
  let strength: PasswordStrengthResult['strength']
  let feedback = ''

  if (password.length === 0) {
    score = 0
    strength = 'weak'
    feedback = 'Enter a password'
  } else if (score < 2) {
    strength = 'weak'
    feedback = 'Very weak password - add more variety'
  } else if (score === 2) {
    strength = 'fair'
    feedback = 'Fair password - could be stronger'
  } else if (score === 3) {
    strength = 'good'
    feedback = 'Good password strength'
  } else if (score === 4) {
    strength = 'strong'
    feedback = 'Strong password'
  } else {
    strength = 'very-strong'
    feedback = 'Very strong password - excellent!'
  }

  return { score, strength, feedback, requirements }
}

export default function PasswordStrength({ 
  password, 
  showRequirements = true 
}: PasswordStrengthProps) {
  const analysis = useMemo(() => calculatePasswordStrength(password), [password])

  const strengthColors = {
    'weak': 'bg-red-500',
    'fair': 'bg-orange-500',
    'good': 'bg-yellow-500',
    'strong': 'bg-lime-500',
    'very-strong': 'bg-green-500',
  }

  const textColors = {
    'weak': 'text-red-600',
    'fair': 'text-orange-600',
    'good': 'text-yellow-600',
    'strong': 'text-lime-600',
    'very-strong': 'text-green-600',
  }

  return (
    <div className="space-y-3">
      {/* Strength Meter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Password Strength</label>
          <span className={`text-sm font-bold ${textColors[analysis.strength]}`}>
            {analysis.feedback}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthColors[analysis.strength]}`}
            style={{ width: `${(analysis.score / 5) * 100}%` }}
          />
        </div>

        {/* Score Dots */}
        <div className="flex gap-1 mt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < analysis.score ? strengthColors[analysis.strength] : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Requirements:</p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${analysis.requirements.length ? 'bg-green-500' : 'bg-gray-300'}`}>
                {analysis.requirements.length && <span className="text-white text-xs flex items-center justify-center">✓</span>}
              </span>
              <span className={analysis.requirements.length ? 'text-gray-700' : 'text-gray-500'}>
                At least 8 characters
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${analysis.requirements.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}>
                {analysis.requirements.uppercase && <span className="text-white text-xs flex items-center justify-center">✓</span>}
              </span>
              <span className={analysis.requirements.uppercase ? 'text-gray-700' : 'text-gray-500'}>
                Uppercase letter (A-Z)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${analysis.requirements.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}>
                {analysis.requirements.lowercase && <span className="text-white text-xs flex items-center justify-center">✓</span>}
              </span>
              <span className={analysis.requirements.lowercase ? 'text-gray-700' : 'text-gray-500'}>
                Lowercase letter (a-z)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${analysis.requirements.number ? 'bg-green-500' : 'bg-gray-300'}`}>
                {analysis.requirements.number && <span className="text-white text-xs flex items-center justify-center">✓</span>}
              </span>
              <span className={analysis.requirements.number ? 'text-gray-700' : 'text-gray-500'}>
                Number (0-9)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${analysis.requirements.special ? 'bg-green-500' : 'bg-gray-300'}`}>
                {analysis.requirements.special && <span className="text-white text-xs flex items-center justify-center">✓</span>}
              </span>
              <span className={analysis.requirements.special ? 'text-gray-700' : 'text-gray-500'}>
                Special character (!@#$%^&*)
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
