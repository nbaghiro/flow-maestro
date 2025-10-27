#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 FlowMaestro Preflight Check\n");

let allPassed = true;

// Check Node.js version
function checkNodeVersion() {
    console.log("📦 Checking Node.js version...");
    const version = process.version;
    const major = parseInt(version.slice(1).split(".")[0]);

    if (major >= 20) {
        console.log(`✅ Node.js ${version} (>= 20.0.0)\n`);
        return true;
    } else {
        console.error(`❌ Node.js ${version} is too old. Required: >= 20.0.0\n`);
        return false;
    }
}

// Check if Docker is installed and running
function checkDocker() {
    console.log("🐳 Checking Docker...");
    try {
        const version = execSync("docker --version", { encoding: "utf-8" });
        console.log(`✅ ${version.trim()}`);

        const dockerRunning = execSync("docker ps", { encoding: "utf-8", stdio: "pipe" });
        console.log("✅ Docker daemon is running\n");
        return true;
    } catch (error) {
        console.error("❌ Docker is not installed or not running");
        console.error("   Please install Docker: https://docs.docker.com/get-docker/\n");
        return false;
    }
}

// Check if Docker Compose is available
function checkDockerCompose() {
    console.log("🐳 Checking Docker Compose...");
    try {
        const version = execSync("docker-compose --version", { encoding: "utf-8" });
        console.log(`✅ ${version.trim()}\n`);
        return true;
    } catch (error) {
        console.error("❌ Docker Compose is not installed\n");
        return false;
    }
}

// Check if services are running
function checkServices() {
    console.log("🔍 Checking services...");
    try {
        const output = execSync("docker-compose ps --services --filter 'status=running'", {
            encoding: "utf-8"
        });
        const runningServices = output.trim().split("\n").filter(Boolean);

        const requiredServices = ["postgres", "redis", "temporal"];
        const missingServices = requiredServices.filter(
            service => !runningServices.includes(service)
        );

        if (missingServices.length === 0) {
            console.log("✅ All required services are running:");
            runningServices.forEach(service => console.log(`   - ${service}`));
            console.log();
            return true;
        } else {
            console.warn("⚠️  Some services are not running:");
            missingServices.forEach(service => console.warn(`   - ${service}`));
            console.warn("\n   Run: npm run docker:up\n");
            return false;
        }
    } catch (error) {
        console.warn("⚠️  Services check failed. Run: npm run docker:up\n");
        return false;
    }
}

// Check if required directories exist
function checkDirectories() {
    console.log("📁 Checking directory structure...");
    const requiredDirs = ["docker", "scripts"];
    const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(process.cwd(), dir)));

    if (missingDirs.length === 0) {
        console.log("✅ All required directories exist\n");
        return true;
    } else {
        console.error("❌ Missing directories:");
        missingDirs.forEach(dir => console.error(`   - ${dir}`));
        console.log();
        return false;
    }
}

// Check if required files exist
function checkFiles() {
    console.log("📄 Checking configuration files...");
    const requiredFiles = [
        "package.json",
        "tsconfig.base.json",
        ".eslintrc.json",
        ".prettierrc.json",
        "docker-compose.yml"
    ];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));

    if (missingFiles.length === 0) {
        console.log("✅ All required configuration files exist\n");
        return true;
    } else {
        console.error("❌ Missing files:");
        missingFiles.forEach(file => console.error(`   - ${file}`));
        console.log();
        return false;
    }
}

// Check TypeScript compilation
function checkTypeScript() {
    console.log("🔧 Checking TypeScript...");
    try {
        execSync("npx tsc --version", { encoding: "utf-8", stdio: "pipe" });
        console.log("✅ TypeScript is available\n");
        return true;
    } catch (error) {
        console.error("❌ TypeScript check failed");
        console.error("   Run: npm install\n");
        return false;
    }
}

// Run all checks
async function runChecks() {
    allPassed = checkNodeVersion() && allPassed;
    allPassed = checkDocker() && allPassed;
    allPassed = checkDockerCompose() && allPassed;
    allPassed = checkDirectories() && allPassed;
    allPassed = checkFiles() && allPassed;
    allPassed = checkTypeScript() && allPassed;
    allPassed = checkServices() && allPassed;

    console.log("━".repeat(50));
    if (allPassed) {
        console.log("✅ All preflight checks passed!");
        console.log("\n🎉 You're ready to start development!");
        console.log("\nNext steps:");
        console.log("  1. Install dependencies: npm install");
        console.log("  2. Start services: npm run docker:up");
        console.log("  3. Start development: npm run dev");
        process.exit(0);
    } else {
        console.log("❌ Some preflight checks failed");
        console.log("\nPlease fix the issues above and run again:");
        console.log("  npm run preflight-check");
        process.exit(1);
    }
}

runChecks();
