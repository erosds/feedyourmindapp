# models.py
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, DECIMAL, TIMESTAMP, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Updated import section to correctly import Pydantic v2 validators
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

Base = declarative_base()

# SQLAlchemy Models
class Professor(Base):
    __tablename__ = "professors"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    lessons = relationship("Lesson", back_populates="professor")
    
class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    birth_date = Column(Date, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    packages = relationship("Package", back_populates="student")
    lessons = relationship("Lesson", back_populates="student")

class Package(Base):
    __tablename__ = "packages"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    total_hours = Column(DECIMAL(5, 2), nullable=False)
    package_cost = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String, default="in_progress")
    is_paid = Column(Boolean, default=False)
    remaining_hours = Column(DECIMAL(5, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("total_hours > 0", name="positive_hours"),
        CheckConstraint("package_cost >= 0", name="positive_cost"),
    )
    
    student = relationship("Student", back_populates="packages")
    lessons = relationship("Lesson", back_populates="package")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    lesson_date = Column(Date, nullable=False)
    duration = Column(DECIMAL(5, 2), nullable=False)
    is_package = Column(Boolean, default=False)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    hourly_rate = Column(DECIMAL(10, 2), nullable=False)
    total_payment = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("duration > 0", name="positive_duration"),
        CheckConstraint("hourly_rate >= 0", name="positive_rate"),
    )
    
    professor = relationship("Professor", back_populates="lessons")
    student = relationship("Student", back_populates="lessons")
    package = relationship("Package", back_populates="lessons")

# Pydantic Models for API
class ProfessorBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    is_admin: bool = False

class ProfessorCreate(ProfessorBase):
    password: str

class ProfessorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None

class ProfessorResponse(ProfessorBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    email: Optional[str] = None
    phone: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PackageBase(BaseModel):
    student_id: int
    start_date: date
    total_hours: Decimal
    package_cost: Decimal
    is_paid: bool = False
    
    @field_validator('total_hours')
    @classmethod
    def check_positive_hours(cls, v):
        if v <= 0:
            raise ValueError('total_hours must be positive')
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_positive_cost(cls, v):
        if v < 0:
            raise ValueError('package_cost must be non-negative')
        return v
    
    @field_validator('start_date')
    @classmethod
    def check_not_future_date(cls, v):
        if v > date.today():
            raise ValueError('La data di inizio non può essere nel futuro')
        return v

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    start_date: Optional[date] = None
    total_hours: Optional[Decimal] = None
    package_cost: Optional[Decimal] = None
    status: Optional[str] = None
    is_paid: Optional[bool] = None
    remaining_hours: Optional[Decimal] = None
    
    @field_validator('total_hours')
    @classmethod
    def check_positive_hours(cls, v):
        if v is not None and v <= 0:
            raise ValueError('total_hours must be positive')
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_positive_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError('package_cost must be non-negative')
        return v

class PackageResponse(PackageBase):
    id: int
    status: str
    remaining_hours: Decimal
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class LessonBase(BaseModel):
    professor_id: int
    student_id: int
    lesson_date: date
    duration: Decimal
    is_package: bool = False
    package_id: Optional[int] = None
    hourly_rate: Decimal
    total_payment: Optional[Decimal] = None
    
    @field_validator('duration')
    @classmethod
    def check_positive_duration(cls, v):
        if v <= 0:
            raise ValueError('duration must be positive')
        return v
    
    @field_validator('hourly_rate')
    @classmethod
    def check_positive_rate(cls, v):
        if v < 0:
            raise ValueError('hourly_rate must be non-negative')
        return v
    
    @model_validator(mode='after')
    def calculate_total_payment(self):
        duration = self.duration
        hourly_rate = self.hourly_rate
        if duration is not None and hourly_rate is not None:
            self.total_payment = duration * hourly_rate
        return self
    
    @field_validator('lesson_date')
    @classmethod
    def check_not_future_date(cls, v):
        if v > date.today():
            raise ValueError('La data della lezione non può essere nel futuro')
        return v

class LessonCreate(LessonBase):
    @field_validator('lesson_date')
    @classmethod
    def check_not_future_date(cls, v):
        if v > date.today():
            raise ValueError('La data della lezione non può essere nel futuro')
        return v

class LessonUpdate(BaseModel):
    professor_id: Optional[int] = None
    student_id: Optional[int] = None
    lesson_date: Optional[date] = None
    duration: Optional[Decimal] = None
    is_package: Optional[bool] = None
    package_id: Optional[int] = None
    hourly_rate: Optional[Decimal] = None
    total_payment: Optional[Decimal] = None
    
    @field_validator('duration')
    @classmethod
    def check_positive_duration(cls, v):
        if v is not None and v <= 0:
            raise ValueError('duration must be positive')
        return v
    
    @field_validator('hourly_rate')
    @classmethod
    def check_positive_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError('hourly_rate must be non-negative')
        return v

class LessonResponse(BaseModel):
    id: int
    professor_id: int
    student_id: int
    lesson_date: date
    duration: Decimal
    is_package: bool
    package_id: Optional[int] = None
    hourly_rate: Decimal
    total_payment: Decimal
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)