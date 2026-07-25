## Architecture

<p align="center">
<img src="images/terraform.png" width="900">
</p>

## Workflow

1. Developer pushes Infrastructure as Code to GitHub.
2. Terraform provisions AWS resources.
3. Creates
   - VPC
   - Security Groups
   - EC2 Instance
4. SSH connects to the EC2 instance.
5. Ansible installs
   - Node.js
   - PM2
   - Application
6. Application starts successfully.

### Technologies

- Terraform
- AWS EC2
- AWS VPC
- Security Groups
- SSH
- Ansible
- Node.js
- PM2

---