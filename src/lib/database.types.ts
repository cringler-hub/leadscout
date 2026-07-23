export type LeadStatus = 'neu' | 'relevant' | 'nicht_relevant' | 'ins_crm'
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'
export type AgentRunStatus = 'running' | 'completed' | 'error'
export type FeedbackValue = 'relevant' | 'nicht_relevant'

export interface ScoreDetails {
  industryFit?: number
  companySizeFit?: number
  regionFit?: number
  buyingSignalFit?: number
  needFit?: number
  contactability?: number
  [key: string]: number | undefined
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          full_name: string | null
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          organization_id: string
          full_name?: string | null
          email: string
        }
        Update: {
          full_name?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          id: string
          organization_id: string
          name: string
          agent_type: string
          description: string | null
          status: AgentStatus
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          name?: string
          agent_type?: string
          description?: string | null
          status?: AgentStatus
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          status?: AgentStatus
          is_active?: boolean
        }
        Relationships: []
      }
      search_profiles: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          industries: string[]
          regions: string[]
          employee_min: number | null
          employee_max: number | null
          revenue_min: number | null
          company_traits: string[]
          buying_signals: string[]
          exclusion_criteria: string[]
          target_roles: string[]
          max_leads_per_run: number
          report_email: string | null
          schedule_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          agent_id: string
          industries?: string[]
          regions?: string[]
          employee_min?: number | null
          employee_max?: number | null
          revenue_min?: number | null
          company_traits?: string[]
          buying_signals?: string[]
          exclusion_criteria?: string[]
          target_roles?: string[]
          max_leads_per_run?: number
          report_email?: string | null
          schedule_time?: string
        }
        Update: {
          industries?: string[]
          regions?: string[]
          employee_min?: number | null
          employee_max?: number | null
          revenue_min?: number | null
          company_traits?: string[]
          buying_signals?: string[]
          exclusion_criteria?: string[]
          target_roles?: string[]
          max_leads_per_run?: number
          report_email?: string | null
          schedule_time?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          search_profile_id: string | null
          company_name: string
          website: string | null
          industry: string | null
          location: string | null
          employee_count: number | null
          estimated_revenue: number | null
          lead_score: number | null
          score_details: ScoreDetails
          reasoning: string | null
          buying_signals: string[]
          recommended_role: string | null
          conversation_trigger: string | null
          source_urls: string[]
          status: LeadStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          agent_id: string
          search_profile_id?: string | null
          company_name: string
          website?: string | null
          industry?: string | null
          location?: string | null
          employee_count?: number | null
          estimated_revenue?: number | null
          lead_score?: number | null
          score_details?: ScoreDetails
          reasoning?: string | null
          buying_signals?: string[]
          recommended_role?: string | null
          conversation_trigger?: string | null
          source_urls?: string[]
          status?: LeadStatus
        }
        Update: {
          status?: LeadStatus
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          search_profile_id: string | null
          status: AgentRunStatus
          started_at: string
          completed_at: string | null
          leads_found: number
          leads_qualified: number
          n8n_execution_id: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          organization_id: string
          agent_id: string
          search_profile_id?: string | null
          status?: AgentRunStatus
          n8n_execution_id?: string | null
        }
        Update: {
          status?: AgentRunStatus
          completed_at?: string | null
          leads_found?: number
          leads_qualified?: number
          n8n_execution_id?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      lead_feedback: {
        Row: {
          id: string
          organization_id: string
          lead_id: string
          user_id: string
          feedback: FeedbackValue
          comment: string | null
          created_at: string
        }
        Insert: {
          organization_id: string
          lead_id: string
          user_id: string
          feedback: FeedbackValue
          comment?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_organization_and_profile: {
        Args: { p_org_name: string; p_full_name: string }
        Returns: string
      }
      current_organization_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}
