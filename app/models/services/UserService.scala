package models.services

import java.util.UUID

import com.mohiva.play.silhouette.api.services.IdentityService
import models.User

import scala.concurrent.Future

/**
 * Handles actions to users.
 */
trait UserService extends IdentityService[User] {

  /**
   * Creates a user.
   *
   * @param user The user to save.
   * @return The saved user.
   */
  def create(user: User): Future[User]

  /**
   * Deletes the user of the specified ID.
   *
   * @param userID The ID of the user to delete.
   * @return
   */
  def delete(userID: UUID): Future[Boolean]
}