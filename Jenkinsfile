pipeline {
    agent any

    tools {
        
        nodejs 'node-js' // Ensure this name matches what's in Jenkins global tool config
    }

    environment {
        MONGO_HOST = "mongodb://172.25.83.246/superData"
        MONGO_DB_CREDS = credentials('mongod-user-pass') // You can use this as a single secret or remove if not used
        MONGO_USERNAME = credentials('mongo-db-username')
        MONGO_PASSWORD = credentials('mongo-db-password')
        SONAR_SCANNER_HOME = tool 'sonarqube-scanaer-610'
        GITEA_TOKEN = credentials('gitea-api-token')
        
    }

    options {
        disableResume()
        disableConcurrentBuilds(abortPrevious: true)
    }

    stages {
        stage('Installing Dependencies') {
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh 'npm audit --audit-level=critical' // avoid breaking pipeline if there are known issues
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan ./
                            --out ./
                            --format ALL 
                            --disableYarnAudit \
                            --prettyPrint
                        ''', odcInstallation: 'OWASP-DepCheck-10'

                        dependencyCheckPublisher(
                            failedTotalCritical: 1,
                            pattern: 'dependency-check-report.xml',
                            stopBuild: true
                        )
                    }
                }
            }
        }

        stage('Unit Testing') {
            options {
                retry(2)
            }
            steps {
                echo "Username: ${env.MONGO_USERNAME}"
                echo "Password: ${env.MONGO_PASSWORD}"
                sh 'npm test' // Avoid immediate failure; capture via test report
                
                
            }
            
        }

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }

          
            }
        }
           stage('SAST- SONARQUBE-TEST') {
            steps {
                timeout(time: 60, unit: 'SECONDS') { 
                withSonarQubeEnv('sonar-qube-server') {
                sh 'echo $SONAR_SCANNER_HOME'
                sh '''
                $SONAR_SCANNER_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=solar-project-system \
                    -Dsonar.sources=app.js \
                    -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info 

                '''
            }
            waitForQualityGate abortPipeline: true
            }
            }
        }
        stage('Build Docker image'){
            steps{
                sh 'printenv'
                sh 'docker build -t webdevloper/solar-system:$GIT_COMMIT .'
                sh 'docker images'
                sh 'docker ps -a'
               
            }
        }
        stage('Trivy vulnerability Scaner'){
            steps{
                sh '''
                    trivy image webdevloper/solar-system:$GIT_COMMIT \
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --quiet \
                        --format json -o trivy-image-MEDIUM-results.json

                    trivy image webdevloper/solar-system:$GIT_COMMIT \
                        --severity CRITICAL \
                        --exit-code 1 \
                        --quiet \
                        --format json -o trivy-image-CRITICAL-results.json
                    '''
            }
            post {
              always {
                  sh '''
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-MEDIUM-results.html trivy-image-MEDIUM-results.json

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-CRITICAL-results.html trivy-image-CRITICAL-results.json

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-MEDIUM-results.xml trivy-image-MEDIUM-results.json

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-CRITICAL-results.xml trivy-image-CRITICAL-results.json
                    '''     
               }
            }
        }

           stage('Push Docker image'){
            steps{
                withDockerRegistry(credentialsId: 'docker-hub-credentials', url: "") {
                
                sh 'docker push webdevloper/solar-system:$GIT_COMMIT'
                }
            }
        }

               stage('deploy - AWS EC2'){
                      when {
                branch 'develop*'

            }
         
            steps{
                script {
             
                        sshagent(['aws-dev-deploy-ec2-instance']) {
                            sh '''
                                ssh -o StrictHostKeyChecking=no ubuntu@15.207.20.220 "
                                if sudo docker ps -a | grep -q "solar-system"; then
                                        echo "Container found. Stopping..."
                                        sudo docker stop "solar-system" && sudo docker rm "solar-system"
                                        echo "Container stopped and removed."
                                fi

                                    sudo docker run --name solar-system \
                                        -e MONGO_URI=$MONGO_URI \
                                        -e MONGO_USERNAME=$MONGO_USERNAME \
                                        -e MONGO_PASSWORD=$MONGO_PASSWORD \
                                        -p 3001:3001 -d webdevloper/solar-system:$GIT_COMMIT

                                "
                            '''
                        }
               }
            }
        }
   
        stage('K8s update image Tag'){
            when {
                branch 'PR*'

            }
            steps {
                sh 'git clone http://172.25.83.246:3000/dasher-org/solar-system-gitops-argocd.git'
                dir("solar-system-gitops-argocd") {
                    sh '''
                    ###### Replace Docker Tag ############### image checker #####
                    git checkout main
                    git checkout -b feature-$BUILD_ID
                    sed -i "s#webdevloper/solar-system.*#webdevloper/solar-system:${GIT_COMMIT}#g" deployment.yaml
                    cat deployment.yaml

                    #### Commit and push Feature branch ###
                    git config --global user.email "admin@gmail.com"
                    git remote set-url origin http://$GITEA_TOKEN@172.25.83.246:3000/dasher-org/solar-system-gitops-argocd
                    git add .
                    git commit -am "Update docker image and argocd"
                    git push -u origin feature-$BUILD_ID
                    '''

                }

            }
        }
        stage('K8s - Raised PR'){
            when {
                branch 'PR*'
            }
            steps{
                sh """
                        curl -X 'POST' \
                        'http://172.25.83.246:3000/api/v1/repos/dasher-org/solar-system-gitops-argocd/pulls' \
                        -H 'accept: application/json' \
                        -H 'Authorization: token $GITEA_TOKEN' \
                        -H 'Content-Type: application/json' \
                        -d '{
                        "assignee": "gitea",
                        "assignees": [
                            "gitea"
                        ],
                        "base": "main",
                        "body": "Update docker image in deployment manifest",
                        "head": "feature-$BUILD_ID",
                        "title": "Update Docker Image"
                        }'
                """
            }
        }
        stage('App Deployed?'){
            when {
                branch 'PR*'
            }
            steps{
                timeout(time: 1, unit: 'DAYS'){
                    input message: 'Is the PR Merged and Argocd Synced?', ok: 'YES! PR is Merged and argocd application deploy.'

                }
            }
        }
        stage('Dast - OWASP ZAP'){
            when {
                branch 'PR*'
            }
            steps{
                sh '''
                    ########### replace below with kuber http://172.25.83.247:30603/api-docs/ ###
                    chmod 777 $(pwd)
                    docker run -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                        -t http://172.25.83.247:30603/api-docs/ \
                        -f openapi \
                        -r zap_report.html \
                        -w zap_report.md \
                        -j zap_json_report.json \
                        -x zap_xml_report.xml \
                        -c zap_ignore_rules
                '''
            }
        }

    }

    post {
        always {
            script{
                if (fileExists('solar-system-gitops-argocd')){
                    sh 'rm -fr solar-system-gitops-argocd'

                }
            }
                junit allowEmptyResults: true, stdioRetention: '', testResults: 'test-results.xml'
                junit allowEmptyResults: true, stdioRetention: '', testResults: 'dependency-check-junit.xml'

                junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-CRITICAL-results.xml'
                junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-MEDIUM-results.xml'

                       publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: './',
                            reportFiles: 'zap_report.html',
                            reportName: 'Dast OWASP zap Report'
                        ])

                   publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: './',
                            reportFiles: 'trivy-image-CRITICAL-results.html',
                            reportName: 'Trivy Image Critical Vul  Report'
                        ])
                           publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: './',
                            reportFiles: 'trivy-image-MEDIUM-results.html',
                            reportName: 'Trivy Image Medium Vul  Report'
                        ])

                publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: './',
                            reportFiles: 'dependency-check-report.html',
                            reportName: 'Dependency Check HTML Report'
                        ])
                publishHTML([
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'coverage/lcov-report',
                    reportFiles: 'index.html',
                    reportName: 'Code Coverage HTML Report'
                ])
        }
    }
}

