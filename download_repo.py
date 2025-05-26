#!/usr/bin/env python3
"""
Download and extract GitHub repository
"""

import urllib.request
import zipfile
import os
import shutil

def download_github_repo(repo_url, branch='main'):
    """Download and extract a GitHub repository"""
    
    # Convert GitHub URL to zip download URL
    if 'github.com' in repo_url:
        parts = repo_url.replace('https://github.com/', '').replace('.git', '')
        zip_url = f"https://github.com/{parts}/archive/{branch}.zip"
    else:
        print("Error: Not a valid GitHub URL")
        return False
    
    print(f"Downloading from: {zip_url}")
    
    try:
        # Try different branch names
        branches = ['main', 'master']
        success = False
        
        for branch in branches:
            try:
                zip_url = f"https://github.com/{parts}/archive/{branch}.zip"
                print(f"Trying branch '{branch}': {zip_url}")
                
                # Download the zip file
                zip_path = "/tmp/repo.zip"
                urllib.request.urlretrieve(zip_url, zip_path)
                success = True
                break
            except Exception as e:
                print(f"Branch '{branch}' failed: {e}")
                continue
        
        if not success:
            print("Error: Could not download from any branch")
            return False
        
        print(f"Downloaded to: {zip_path}")
        
        # Extract the zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall("/tmp/extracted")
        
        # Find the extracted folder (it will have a suffix like -main or -master)
        extracted_dirs = os.listdir("/tmp/extracted")
        if not extracted_dirs:
            print("Error: No extracted directories found")
            return False
        
        source_dir = os.path.join("/tmp/extracted", extracted_dirs[0])
        
        # Copy all files from the extracted directory to current directory
        for item in os.listdir(source_dir):
            source_path = os.path.join(source_dir, item)
            dest_path = os.path.join(".", item)
            
            if os.path.isdir(source_path):
                if os.path.exists(dest_path):
                    shutil.rmtree(dest_path)
                shutil.copytree(source_path, dest_path)
            else:
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                shutil.copy2(source_path, dest_path)
        
        print("Repository files copied successfully!")
        
        # Clean up
        os.remove(zip_path)
        shutil.rmtree("/tmp/extracted")
        
        return True
        
    except Exception as e:
        print(f"Error downloading repository: {e}")
        return False

if __name__ == "__main__":
    repo_url = "https://github.com/haythem-dev/AISystemHub"
    success = download_github_repo(repo_url)
    
    if success:
        print("\n✅ Repository downloaded successfully!")
        print("📁 Files in current directory:")
        for item in sorted(os.listdir(".")):
            if not item.startswith('.'):
                print(f"  - {item}")
    else:
        print("\n❌ Failed to download repository")
