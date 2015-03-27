package models.daos

import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import models.User

import scala.concurrent.Future

/**
 * Give access to the user object.
 */
trait UserDAO {

  /**
   * Finds a user by its login info.
   *
   * @param loginInfo The login info of the user to find.
   * @return The found user or None if no user for the given login info could be found.
   */
  def find(loginInfo: LoginInfo): Future[Option[User]]

  /**
   * Finds a user by its user ID.
   *
   * @param email The ID of the user to find.
   * @return The found user or None if no user for the given ID could be found.
   */
  def find(email: String): Future[Option[User]]

  /**
   * Creates a user.
   *
   * @param user The user to save.
   * @return The saved user.
   */
  def create(user: User): Future[User]

  /**
   * Updates a user. (Maybe save should be called create? or do both create and update?)
   *
   * @param user The user to update
   * @return The updated user.
   */
  def update(user:User): Future[User]

  /**
   * Deletes a user of the specified ID.
   *
   * @param email The ID of the user to find.
   * @return
   */
  def delete(email: String): Future[Boolean]
}