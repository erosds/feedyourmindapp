# routes/packages.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import func

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/packages",
    tags=["packages"],
    responses={404: {"description": "Not found"}},
)

def calculate_expiry_date(start_date: date) -> date:
    """
    Calculate the expiration date for a package (30 days from start date).
    
    Args:
        start_date: Package start date
        
    Returns:
        Expiration date (30 days after start date)
    """
    return start_date + timedelta(days=30)

def update_package_status(db: Session, package_id: int, commit: bool = True):
    """
    Update package status based on expiry date and payment status.
    Also recalculates remaining hours.
    """
    # Get the package
    package = db.query(models.Package).filter(models.Package.id == package_id).with_for_update().first()
    if not package:
        return None
    
    # Calculate hours used in lessons
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Remaining hours are total hours minus used hours
    package.remaining_hours = max(Decimal('0'), package.total_hours - hours_used)
    
    # Update status based on expiry date and payment
    today = date.today()
    
    if package.is_paid:
        package.status = "completed"
    elif today > package.expiry_date:
        package.status = "expired"
    else:
        package.status = "in_progress"
    
    # Commit if requested
    if commit:
        db.commit()
        db.refresh(package)
    
    return package

@router.post("/", response_model=models.PackageResponse, status_code=status.HTTP_201_CREATED)
def create_package(package: models.PackageCreate, db: Session = Depends(get_db)):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == package.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check for active packages
    active_package = db.query(models.Package).filter(
        models.Package.student_id == package.student_id,
        models.Package.status == "in_progress"
    ).first()
    
    if active_package:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Student already has an active package",
                "active_package_id": active_package.id,
                "active_package_remaining_hours": float(active_package.remaining_hours)
            }
        )
    
    # Ensure total hours and cost are positive
    total_hours = max(Decimal('0.5'), package.total_hours)
    package_cost = max(Decimal('0'), package.package_cost)
    
    # Calculate expiry date (30 days from start date)
    expiry_date = calculate_expiry_date(package.start_date)
    
    # Determine payment date
    payment_date = package.payment_date if package.is_paid else None
    
    # Set initial status
    status = "completed" if package.is_paid else "in_progress"
    if date.today() > expiry_date and not package.is_paid:
        status = "expired"
    
    # Create new package
    db_package = models.Package(
        student_id=package.student_id,
        start_date=package.start_date,
        total_hours=total_hours,
        package_cost=package_cost,
        status=status,
        is_paid=package.is_paid,
        payment_date=payment_date,
        remaining_hours=total_hours,  # Initially, remaining = total
        expiry_date=expiry_date
    )
    
    # Save to database
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    
    return db_package

@router.get("/", response_model=List[models.PackageResponse])
def read_packages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    packages = db.query(models.Package).offset(skip).limit(limit).all()
    return packages

@router.get("/{package_id}", response_model=models.PackageResponse)
def read_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Always update status when fetching a package
    update_package_status(db, package_id)
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    
    return db_package

@router.get("/student/{student_id}", response_model=List[models.PackageResponse])
def read_student_packages(student_id: int, db: Session = Depends(get_db)):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all student packages
    packages = db.query(models.Package).filter(models.Package.student_id == student_id).all()
    
    # Update status for each package
    for pkg in packages:
        update_package_status(db, pkg.id, commit=False)
    
    db.commit()
    packages = db.query(models.Package).filter(models.Package.student_id == student_id).all()
    
    return packages

@router.get("/student/{student_id}/active", response_model=models.PackageResponse)
def read_student_active_package(student_id: int, db: Session = Depends(get_db)):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update all packages for this student first
    packages = db.query(models.Package).filter(models.Package.student_id == student_id).all()
    for pkg in packages:
        update_package_status(db, pkg.id, commit=False)
    db.commit()
    
    # Get active package
    active_package = db.query(models.Package).filter(
        models.Package.student_id == student_id,
        models.Package.status == "in_progress"
    ).first()
    
    if not active_package:
        raise HTTPException(status_code=404, detail="No active package found for this student")
    
    return active_package

@router.put("/{package_id}", response_model=models.PackageResponse)
def update_package(package_id: int, package: models.PackageUpdate, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Calculate hours used in lessons
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Create a copy of the update data
    update_data = package.dict(exclude_unset=True)
    
    # Handle start date change (recalculate expiry date)
    if "start_date" in update_data:
        update_data["expiry_date"] = calculate_expiry_date(update_data["start_date"])
    
    # Validate total hours (must be >= hours used)
    if "total_hours" in update_data and update_data["total_hours"] < hours_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total hours cannot be less than hours already used ({hours_used})"
        )
    
    # Handle payment status change
    if "is_paid" in update_data:
        # If changing to paid and no payment date provided
        if update_data["is_paid"] and not db_package.is_paid:
            if "payment_date" not in update_data or not update_data["payment_date"]:
                update_data["payment_date"] = date.today()
        
        # If changing to unpaid, remove payment date
        if not update_data["is_paid"] and db_package.is_paid:
            update_data["payment_date"] = None
    
    # Update all fields
    for key, value in update_data.items():
        setattr(db_package, key, value)
    
    # Save changes
    db.commit()
    
    # Update remaining hours and status
    update_package_status(db, package_id)
    
    # Refresh package data
    db.refresh(db_package)
    return db_package

@router.delete("/{package_id}", response_model=dict)
def delete_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Find all lessons associated with this package
    related_lessons = db.query(models.Lesson).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).all()
    
    # Save information about lessons to delete
    lessons_info = [
        {
            "id": lesson.id, 
            "date": lesson.lesson_date, 
            "student_id": lesson.student_id,
            "professor_id": lesson.professor_id,
            "duration": float(lesson.duration)
        } 
        for lesson in related_lessons
    ]
    
    # Delete associated lessons
    for lesson in related_lessons:
        db.delete(lesson)
    
    # Delete the package
    db.delete(db_package)
    db.commit()
    
    # Return information about what was deleted
    return {
        "package_id": package_id,
        "deleted_lessons_count": len(related_lessons),
        "deleted_lessons": lessons_info
    }