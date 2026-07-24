resource "aws_security_group" "monitor_sg" {
  name        = "monitor-sg"
  description = "Security Group for Monitoring Server"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "monitor_server" {

  ami           = "ami-0b6d9d3d33ba97d99"
  instance_type = "t2.micro"

   key_name = "monitor-key"

  vpc_security_group_ids = [
    aws_security_group.monitor_sg.id
  ]

  tags = {
    Name = "monitor-server"
  }
}