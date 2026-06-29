pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Web Dependencies') {
            when {
                expression { fileExists('apps/web/package-lock.json') }
            }
            steps {
                dir('apps/web') {
                    sh 'npm ci'
                }
            }
        }

        stage('Install API Dependencies') {
            when {
                expression { fileExists('apps/api/package-lock.json') }
            }
            steps {
                dir('apps/api') {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint Web') {
            when {
                expression { fileExists('apps/web/package.json') }
            }
            steps {
                dir('apps/web') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Lint API') {
            when {
                expression { fileExists('apps/api/package.json') }
            }
            steps {
                dir('apps/api') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Test API') {
            when {
                expression { fileExists('apps/api/package.json') }
            }
            steps {
                dir('apps/api') {
                    sh 'npm test -- --runInBand'
                }
            }
        }

        stage('Build Web') {
            when {
                expression { fileExists('apps/web/package.json') }
            }
            steps {
                dir('apps/web') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build API') {
            when {
                expression { fileExists('apps/api/package.json') }
            }
            steps {
                dir('apps/api') {
                    sh 'npm run build'
                }
            }
        }
    }

    post {
        always {
            echo "ProofChain pipeline finished with status: ${currentBuild.currentResult}"
        }
    }
}
