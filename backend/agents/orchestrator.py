"""
ServerGem Orchestrator Agent
Production-grade Gemini ADK integration with real service calls
"""

import asyncio
from typing import Dict, List, Optional
import google.generativeai as genai
from datetime import datetime
import json

class OrchestratorAgent:
    """
    Production-grade orchestrator using Gemini ADK with function calling.
    Routes to real services: GitHub, Google Cloud, Docker, Analysis.
    """
    
    def __init__(self, gemini_api_key: str, github_token: str = None, gcloud_project: str = None):
        genai.configure(api_key=gemini_api_key)
        
        # Initialize Gemini with function declarations
        self.model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',
            tools=[self._get_function_declarations()]
        )
        
        self.conversation_history: List[Dict] = []
        self.project_context: Dict = {}
        self.chat_session = None
        
        # Initialize real services
        from backend.services import GitHubService, GCloudService, DockerService, AnalysisService
        
        self.github_service = GitHubService(github_token)
        self.gcloud_service = GCloudService(gcloud_project) if gcloud_project else None
        self.docker_service = DockerService()
        self.analysis_service = AnalysisService(gemini_api_key)
    
    def _get_function_declarations(self) -> List[Dict]:
        """
        Define real functions available for Gemini ADK to call
        Uses proper Google AI SDK format
        """
        return [
            {
                'name': 'clone_and_analyze_repo',
                'description': 'Clone a GitHub repository and perform comprehensive analysis to detect framework, dependencies, and deployment requirements. Use this when user provides a GitHub repo URL.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'repo_url': {
                            'type': 'string',
                            'description': 'GitHub repository URL (https://github.com/user/repo or git@github.com:user/repo.git)'
                        },
                        'branch': {
                            'type': 'string',
                            'description': 'Branch name to clone and analyze (default: main)'
                        }
                    },
                    'required': ['repo_url']
                }
            },
            {
                'name': 'deploy_to_cloudrun',
                'description': 'Deploy an analyzed project to Google Cloud Run. Generates Dockerfile, builds image via Cloud Build, and deploys the service. Use this after analyzing a repository.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'project_path': {
                            'type': 'string',
                            'description': 'Local path to the cloned project (from project_context)'
                        },
                        'service_name': {
                            'type': 'string',
                            'description': 'Name for the Cloud Run service (lowercase, hyphens allowed)'
                        },
                        'env_vars': {
                            'type': 'object',
                            'description': 'Environment variables as key-value pairs (optional)'
                        }
                    },
                    'required': ['project_path', 'service_name']
                }
            },
            {
                'name': 'list_user_repositories',
                'description': 'List GitHub repositories for the authenticated user. Use this when user asks to see their repos or wants to select a project to deploy.',
                'parameters': {
                    'type': 'object',
                    'properties': {},
                    'required': []
                }
            },
            {
                'name': 'get_deployment_logs',
                'description': 'Fetch recent logs from a deployed Cloud Run service. Use this for debugging deployment issues or when user asks to see logs.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'service_name': {
                            'type': 'string',
                            'description': 'Cloud Run service name'
                        },
                        'limit': {
                            'type': 'integer',
                            'description': 'Number of log entries to fetch (default: 50)'
                        }
                    },
                    'required': ['service_name']
                }
            }
        ]
    
    async def process_message(self, user_message: str, session_id: str, progress_callback=None) -> Dict:
        """
        Main entry point: processes user message with Gemini ADK function calling
        
        Args:
            user_message: User's chat message
            session_id: Session identifier
            progress_callback: Optional async callback for real-time updates
        """
        
        # Initialize chat session if needed
        if not self.chat_session:
            self.chat_session = self.model.start_chat(history=[])
        
        # Add project context to enhance Gemini's understanding
        context_prefix = self._build_context_prefix()
        enhanced_message = f"{context_prefix}\n\nUser: {user_message}" if context_prefix else user_message
        
        try:
            # Send to Gemini with function calling enabled
            response = await asyncio.to_thread(
                self.chat_session.send_message,
                enhanced_message
            )
            
            # Check if Gemini wants to call a function
            if response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call'):
                        # Route to real service handler
                        return await self._handle_function_call(
                            part.function_call,
                            progress_callback=progress_callback
                        )
            
            # Regular text response (no function call needed)
            return {
                'type': 'message',
                'content': response.text,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[Orchestrator] Error: {str(e)}")
            return {
                'type': 'error',
                'content': f'❌ Error processing message: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_function_call(self, function_call, progress_callback=None) -> Dict:
        """
        Route Gemini function calls to real service implementations
        
        Args:
            function_call: Gemini function call object
            progress_callback: Optional async callback for WebSocket updates
        """
        
        function_name = function_call.name
        args = dict(function_call.args)
        
        print(f"[Orchestrator] Function call: {function_name} with args: {args}")
        
        # Route to real service handlers
        handlers = {
            'clone_and_analyze_repo': self._handle_clone_and_analyze,
            'deploy_to_cloudrun': self._handle_deploy_to_cloudrun,
            'list_user_repositories': self._handle_list_repos,
            'get_deployment_logs': self._handle_get_logs
        }
        
        handler = handlers.get(function_name)
        
        if handler:
            return await handler(progress_callback=progress_callback, **args)
        else:
            return {
                'type': 'error',
                'content': f'❌ Unknown function: {function_name}',
                'timestamp': datetime.now().isoformat()
            }
    
    # ========================================================================
    # REAL SERVICE HANDLERS - Production Implementation
    # ========================================================================
    
    async def _handle_clone_and_analyze(self, repo_url: str, branch: str = 'main', progress_callback=None) -> Dict:
        """
        Clone GitHub repo and analyze it - REAL IMPLEMENTATION
        Uses: GitHubService, AnalysisService, DockerService
        """
        
        try:
            if progress_callback:
                await progress_callback({
                    'type': 'typing',
                    'message': f'Cloning repository {repo_url}...'
                })
            
            # Step 1: Clone repository using GitHubService
            clone_result = self.github_service.clone_repository(repo_url, branch)
            
            if not clone_result.get('success'):
                return {
                    'type': 'error',
                    'content': f"❌ **Failed to clone repository**\n\n{clone_result.get('error')}\n\nPlease check:\n• Repository URL is correct\n• You have access to the repository\n• GitHub token has proper permissions",
                    'timestamp': datetime.now().isoformat()
                }
            
            project_path = clone_result['local_path']
            self.project_context['project_path'] = project_path
            self.project_context['repo_url'] = repo_url
            self.project_context['branch'] = branch
            
            if progress_callback:
                await progress_callback({
                    'type': 'typing',
                    'message': f'Analyzing codebase ({clone_result["files_count"]} files)...'
                })
            
            # Step 2: Analyze project using AnalysisService
            analysis_result = await self.analysis_service.analyze_and_generate(project_path)
            
            if not analysis_result.get('success'):
                return {
                    'type': 'error',
                    'content': f"❌ **Analysis failed**\n\n{analysis_result.get('error')}",
                    'timestamp': datetime.now().isoformat()
                }
            
            # Step 3: Save Dockerfile using DockerService
            dockerfile_save = self.docker_service.save_dockerfile(
                analysis_result['dockerfile']['content'],
                project_path
            )
            
            # Step 4: Create .dockerignore
            self.docker_service.create_dockerignore(
                project_path,
                analysis_result['analysis']['language']
            )
            
            # Store analysis in context for future operations
            self.project_context['analysis'] = analysis_result['analysis']
            self.project_context['framework'] = analysis_result['analysis']['framework']
            self.project_context['language'] = analysis_result['analysis']['language']
            
            # Format beautiful response
            analysis_data = analysis_result['analysis']
            content = f"""
🔍 **Analysis Complete: {repo_url.split('/')[-1]}**

**Framework:** {analysis_data['framework']} ({analysis_data['language']})
**Entry Point:** `{analysis_data['entry_point']}`
**Dependencies:** {analysis_data['dependencies_count']} packages
**Port:** {analysis_data['port']}
{f"**Database:** {analysis_data['database']}" if analysis_data.get('database') else ''}
{f"**Environment Variables:** {len(analysis_data['env_vars'])} detected" if analysis_data.get('env_vars') else ''}

✅ **Dockerfile Generated** ({dockerfile_save.get('path', 'Dockerfile')})
{chr(10).join(['• ' + opt for opt in analysis_result['dockerfile']['optimizations'][:4]])}

📋 **Recommendations:**
{chr(10).join(['• ' + rec for rec in analysis_result['recommendations'][:3]])}

{f"⚠️ **Warnings:**{chr(10)}{chr(10).join(['• ' + w for w in analysis_result['warnings']][:2])}" if analysis_result.get('warnings') else ''}

Ready to deploy to Google Cloud Run! Would you like me to proceed?
            """.strip()
            
            return {
                'type': 'analysis',
                'content': content,
                'data': analysis_result,
                'actions': [
                    {
                        'id': 'deploy',
                        'label': '🚀 Deploy to Cloud Run',
                        'type': 'button',
                        'action': 'deploy'
                    },
                    {
                        'id': 'view_dockerfile',
                        'label': '📄 View Dockerfile',
                        'type': 'button',
                        'action': 'view_dockerfile'
                    },
                    {
                        'id': 'configure_env',
                        'label': '⚙️ Configure Env Vars',
                        'type': 'button',
                        'action': 'configure_env'
                    }
                ],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[Orchestrator] Clone and analyze error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'type': 'error',
                'content': f'❌ **Analysis failed**\n\n```\n{str(e)}\n```\n\nPlease try again or check the logs.',
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_deploy_to_cloudrun(
        self,
        project_path: str,
        service_name: str,
        env_vars: Dict = None,
        progress_callback=None
    ) -> Dict:
        """
        Deploy to Cloud Run - REAL IMPLEMENTATION
        Uses: GCloudService, DockerService
        """
        
        if not self.gcloud_service:
            return {
                'type': 'error',
                'content': '❌ **Google Cloud not configured**\n\nPlease set `GOOGLE_CLOUD_PROJECT` environment variable.\n\nExample:\n```bash\nexport GOOGLE_CLOUD_PROJECT=my-project-id\n```',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            # Validate gcloud authentication
            auth_check = self.gcloud_service.validate_gcloud_auth()
            if not auth_check.get('authenticated'):
                return {
                    'type': 'error',
                    'content': f"❌ **Not authenticated with gcloud**\n\n{auth_check.get('error')}\n\nRun:\n```bash\ngcloud auth login\ngcloud config set project YOUR_PROJECT_ID\n```",
                    'timestamp': datetime.now().isoformat()
                }
            
            # Clean service name (Cloud Run requirements)
            service_name = service_name.lower().replace('_', '-').replace(' ', '-')
            
            # Validate Dockerfile exists
            dockerfile_check = self.docker_service.validate_dockerfile(project_path)
            if not dockerfile_check.get('valid'):
                return {
                    'type': 'error',
                    'content': f"❌ **Invalid Dockerfile**\n\n{dockerfile_check.get('error')}",
                    'timestamp': datetime.now().isoformat()
                }
            
            # Step 1: Build Docker image with Cloud Build
            if progress_callback:
                await progress_callback({
                    'type': 'deployment_update',
                    'data': {
                        'stage': 'build',
                        'progress': 10,
                        'message': 'Submitting build to Cloud Build...'
                    }
                })
            
            async def build_progress(data):
                if progress_callback:
                    await progress_callback({'type': 'deployment_update', 'data': data})
            
            build_result = await self.gcloud_service.build_image(
                project_path,
                service_name,
                progress_callback=build_progress
            )
            
            if not build_result.get('success'):
                return {
                    'type': 'error',
                    'content': f"❌ **Build failed**\n\n{build_result.get('error')}\n\nCheck:\n• Dockerfile syntax\n• Cloud Build API is enabled\n• Billing is enabled",
                    'timestamp': datetime.now().isoformat()
                }
            
            # Step 2: Deploy to Cloud Run
            if progress_callback:
                await progress_callback({
                    'type': 'deployment_update',
                    'data': {
                        'stage': 'deploy',
                        'progress': 60,
                        'message': 'Deploying to Cloud Run...'
                    }
                })
            
            async def deploy_progress(data):
                if progress_callback:
                    await progress_callback({'type': 'deployment_update', 'data': data})
            
            deploy_result = await self.gcloud_service.deploy_to_cloudrun(
                build_result['image_tag'],
                service_name,
                env_vars=env_vars,
                progress_callback=deploy_progress
            )
            
            if not deploy_result.get('success'):
                return {
                    'type': 'error',
                    'content': f"❌ **Deployment failed**\n\n{deploy_result.get('error')}\n\nCheck:\n• Cloud Run API is enabled\n• Service account permissions",
                    'timestamp': datetime.now().isoformat()
                }
            
            # Success! Store deployment info
            self.project_context['deployed_service'] = service_name
            self.project_context['deployment_url'] = deploy_result['url']
            
            content = f"""
🎉 **Deployment Successful!**

Your service is now live at:
**{deploy_result['url']}**

**Service:** {service_name}
**Region:** {deploy_result['region']}

✅ Auto HTTPS enabled
✅ Auto-scaling configured
✅ Health checks active
✅ Monitoring enabled

What would you like to do next?
            """.strip()
            
            return {
                'type': 'deployment_complete',
                'content': content,
                'data': deploy_result,
                'actions': [
                    {
                        'id': 'view_logs',
                        'label': '📊 View Logs',
                        'type': 'button',
                        'action': 'view_logs'
                    },
                    {
                        'id': 'setup_cicd',
                        'label': '🔄 Setup CI/CD',
                        'type': 'button',
                        'action': 'setup_cicd'
                    },
                    {
                        'id': 'custom_domain',
                        'label': '🌐 Add Custom Domain',
                        'type': 'button',
                        'action': 'custom_domain'
                    }
                ],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[Orchestrator] Deployment error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'type': 'error',
                'content': f'❌ **Deployment failed**\n\n```\n{str(e)}\n```',
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_list_repos(self, progress_callback=None) -> Dict:
        """List user's GitHub repositories - REAL IMPLEMENTATION"""
        
        try:
            # Validate GitHub token first
            token_check = self.github_service.validate_token()
            if not token_check.get('valid'):
                return {
                    'type': 'error',
                    'content': f"❌ **GitHub token invalid**\n\n{token_check.get('error')}\n\nPlease set `GITHUB_TOKEN` environment variable.\n\nGet token at: https://github.com/settings/tokens",
                    'timestamp': datetime.now().isoformat()
                }
            
            if progress_callback:
                await progress_callback({
                    'type': 'typing',
                    'message': 'Fetching your GitHub repositories...'
                })
            
            repos = self.github_service.list_repositories()
            
            if not repos:
                return {
                    'type': 'message',
                    'content': '📚 **No repositories found**\n\nCreate a repository on GitHub first, then try again.',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Format repo list beautifully
            repo_list = '\n'.join([
                f"**{i+1}. {repo['name']}** ({repo['language'] or 'Unknown'})"
                f"\n   {repo.get('description', 'No description')[:60]}"
                f"\n   ⭐ {repo['stars']} stars | 🔒 {'Private' if repo['private'] else 'Public'}"
                for i, repo in enumerate(repos[:10])
            ])
            
            content = f"""
📚 **Your GitHub Repositories** ({len(repos)} total)

{repo_list}

Which repository would you like to deploy? Just tell me the name or paste the URL!
            """.strip()
            
            return {
                'type': 'message',
                'content': content,
                'data': {'repositories': repos},
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[Orchestrator] List repos error: {str(e)}")
            return {
                'type': 'error',
                'content': f'❌ **Failed to list repositories**\n\n{str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_get_logs(self, service_name: str, limit: int = 50, progress_callback=None) -> Dict:
        """Get deployment logs - REAL IMPLEMENTATION"""
        
        if not self.gcloud_service:
            return {
                'type': 'error',
                'content': '❌ **Google Cloud not configured**\n\nPlease set `GOOGLE_CLOUD_PROJECT` environment variable.',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            if progress_callback:
                await progress_callback({
                    'type': 'typing',
                    'message': f'Fetching logs for {service_name}...'
                })
            
            logs = self.gcloud_service.get_service_logs(service_name, limit=limit)
            
            if not logs or len(logs) == 0:
                return {
                    'type': 'message',
                    'content': f'📊 **No logs found for {service_name}**\n\nService may not have received traffic yet.',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Format logs
            log_output = '\n'.join(logs[-20:])  # Last 20 entries
            
            content = f"""
📊 **Logs for {service_name}**

```
{log_output}
```

Showing last {min(20, len(logs))} entries (total: {len(logs)})
            """.strip()
            
            return {
                'type': 'message',
                'content': content,
                'data': {'logs': logs},
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[Orchestrator] Get logs error: {str(e)}")
            return {
                'type': 'error',
                'content': f'❌ **Failed to fetch logs**\n\n{str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    # ========================================================================
    # CONTEXT MANAGEMENT
    # ========================================================================
    
    def _build_context_prefix(self) -> str:
        """Build context string from stored project data"""
        if not self.project_context:
            return ""
        
        context_parts = []
        if 'framework' in self.project_context:
            context_parts.append(f"Framework: {self.project_context['framework']}")
        if 'language' in self.project_context:
            context_parts.append(f"Language: {self.project_context['language']}")
        if 'deployed_service' in self.project_context:
            context_parts.append(f"Deployed Service: {self.project_context['deployed_service']}")
        if 'project_path' in self.project_context:
            context_parts.append(f"Project Path: {self.project_context['project_path']}")
        
        return "Current project context: " + ", ".join(context_parts) if context_parts else ""
    
    def update_context(self, key: str, value: any):
        """Update project context"""
        self.project_context[key] = value
    
    def get_context(self) -> Dict:
        """Get current project context"""
        return self.project_context


# Test orchestrator with real services
async def test_orchestrator():
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    orchestrator = OrchestratorAgent(
        gemini_api_key=os.getenv('GEMINI_API_KEY'),
        github_token=os.getenv('GITHUB_TOKEN'),
        gcloud_project=os.getenv('GOOGLE_CLOUD_PROJECT')
    )
    
    test_messages = [
        "List my GitHub repositories",
        "Analyze my repo: https://github.com/user/flask-app",
        "Deploy it to Cloud Run as my-flask-service"
    ]
    
    for msg in test_messages:
        print(f"\n{'='*60}")
        print(f"🧑 USER: {msg}")
        print(f"{'='*60}")
        response = await orchestrator.process_message(msg, session_id="test-123")
        print(f"🤖 SERVERGEM:\n{response['content']}")

if __name__ == "__main__":
    asyncio.run(test_orchestrator())
